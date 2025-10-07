from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Usuario
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .serializers import UsuarioSerializer
import json

@csrf_exempt
def register_user(request):
    """
    Handles user registration and automatically assigns the 'Estudiante' role.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            username = data.get('username')
            nom_user = data.get('nom_user')
            ape_pat_user = data.get('ape_pat_user')
            ape_mat_user = data.get('ape_mat_user', '')
            
            # Basic validation
            if not all([email, password, username, nom_user, ape_pat_user]):
                return JsonResponse({'error': 'Todos los campos obligatorios deben ser proporcionados.'}, status=400)

            # Automatically set the user type to 'Estudiante'
            user = Usuario.objects.create_user(
                CorreoUser=email,
                UserName=username,
                NomUser=nom_user,
                ApePatUser=ape_pat_user,
                ApeMatUser=ape_mat_user,
                password=password,
                TipoUser='Estudiante'  # This is the key change
            )
            
            return JsonResponse({'message': 'Usuario registrado exitosamente.'}, status=201)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Formato JSON inválido.'}, status=400)
        except ValueError as e:
            return JsonResponse({'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Ocurrió un error inesperado: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Método no permitido.'}, status=405)

@csrf_exempt
def login_user(request):
    """
    Handles user login and session creation.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            # Authenticate the user with the custom user model
            user = authenticate(request, username=email, password=password)

            if user is not None:
                # Login the user and start a session
                login(request, user)
                return JsonResponse({
                    'message': 'Inicio de sesión exitoso.',
                    'username': user.UserName,
                    'email': user.CorreoUser
                })
            else:
                return JsonResponse({'error': 'Credenciales de inicio de sesión inválidas.'}, status=400)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Formato JSON inválido.'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Ocurrió un error inesperado: {str(e)}'}, status=500)
            
    return JsonResponse({'error': 'Método no permitido.'}, status=405)

class IsAdminOrSuperUser(permissions.BasePermission):
    """
    Permite el acceso solo si el usuario es 'Admin' o 'SuperAdministrador' (is_superuser=True).
    """
    def has_permission(self, request, view):
        # Asume que 'Admin' es el tipo que puede gestionar
        return bool(request.user and request.user.is_authenticated and 
                    (request.user.TipoUser == 'Admin' or request.user.is_superuser))

class UsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD completo para el modelo Usuario.
    - Acceso restringido a Administradores y Super Administradores.
    """
    queryset = Usuario.objects.all().order_by('idUser')
    serializer_class = UsuarioSerializer
    permission_classes = [IsAdminOrSuperUser] # Aplica la restricción

    # Modificación del método create (POST) para manejar contraseñas
def create(self, request, *args, **kwargs):
        # Usa el serializador para validar datos, pero excluye la contraseña para manejo manual
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Obtenemos la contraseña antes de guardar
        password = request.data.get('password')
        tipo_user = request.data.get('TipoUser', 'Estudiante') # Por si se registra un Estudiante

        # Creamos el usuario asegurando que la contraseña se hashee
        try:
            user = Usuario.objects.create_user(
                CorreoUser=request.data['CorreoUser'],
                UserName=request.data['UserName'],
                NomUser=request.data['NomUser'],
                ApePatUser=request.data['ApePatUser'],
                ApeMatUser=request.data.get('ApeMatUser', ''),
                password=password,
                TipoUser=tipo_user
            )
            # Retorna la respuesta con el objeto creado
            headers = self.get_success_headers(serializer.data)
            return Response(UsuarioSerializer(user).data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
             return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


    # Modificación del método update (PUT/PATCH) para manejar contraseñas y permisos
def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        password = request.data.pop('password', None) # Quita la contraseña del dict si existe
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Actualiza el resto de los campos
        self.perform_update(serializer)
        
        # Si se proporcionó una nueva contraseña, la hashea
        if password:
            instance.set_password(password)
            instance.save() # Guarda los cambios de la contraseña
            
        return Response(serializer.data)