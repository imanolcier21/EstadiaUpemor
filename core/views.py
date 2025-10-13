from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Usuario
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .serializers import UsuarioSerializer
import json
from rest_framework.decorators import api_view # Necesario para register/login

# --- VISTAS PÚBLICAS DE AUTENTICACIÓN ---

@csrf_exempt
def register_user(request):
    """
    Maneja el registro público, asignando automáticamente el rol 'Estudiante'.
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
            
            # Validación básica de campos requeridos por el modelo Usuario
            if not all([email, password, username, nom_user, ape_pat_user]):
                return JsonResponse({'error': 'Todos los campos obligatorios deben ser proporcionados.'}, status=400)

            # Crea el usuario con TipoUser='Estudiante'
            user = Usuario.objects.create_user(
                CorreoUser=email,
                UserName=username,
                NomUser=nom_user,
                ApePatUser=ape_pat_user,
                ApeMatUser=ape_mat_user,
                password=password,
                TipoUser='Estudiante'
            )
            
            return JsonResponse({'message': 'Usuario registrado exitosamente.'}, status=201)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Formato JSON inválido.'}, status=400)
        except ValueError as e:
            # Captura errores de validación de campos únicos (CorreoUser, UserName)
            return JsonResponse({'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Ocurrió un error inesperado: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Método no permitido.'}, status=405)

@csrf_exempt
def login_user(request):
    """
    Maneja el inicio de sesión y la creación de la sesión, retornando el rol del usuario.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            user = authenticate(request, username=email, password=password)

            if user is not None:
                login(request, user)
                return JsonResponse({
                    'message': 'Inicio de sesión exitoso.',
                    'TipoUser': user.TipoUser,
                    'is_superuser': user.is_superuser
                })
            else:
                return JsonResponse({'error': 'Credenciales de inicio de sesión inválidas.'}, status=400)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Formato JSON inválido.'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Ocurrió un error inesperado: {str(e)}'}, status=500)
            
    return JsonResponse({'error': 'Método no permitido.'}, status=405)

# --- PERMISOS Y VISTAS ADMINISTRATIVAS ---

class IsAdminOrSuperUser(permissions.BasePermission):
    """
    Permite el acceso solo si el usuario es 'Admin' o Superuser.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                    (request.user.TipoUser == 'Admin' or request.user.is_superuser))

class UsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD para el modelo Usuario (Gestión de Usuarios).
    Solo accesible para roles administrativos.
    """
    queryset = Usuario.objects.all().order_by('idUser')
    serializer_class = UsuarioSerializer
    permission_classes = [IsAdminOrSuperUser] # Aplica la restricción de acceso

    # Modificación del método create (POST) - CREAR USUARIO/ADMIN
    def create(self, request, *args, **kwargs):
        # 1. Usar el serializador para VALIDACIÓN
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. Extraer datos del serializador validado
        data = serializer.validated_data 
        
        # Necesitamos la contraseña y el TipoUser para la creación
        password = request.data.get('password')
        tipo_user = data.get('TipoUser', 'Estudiante') # Toma el rol enviado por el formulario

        # 3. Crear el usuario usando el manager custom para hashear la contraseña
        try:
            user = Usuario.objects.create_user(
                CorreoUser=data['CorreoUser'],
                UserName=data['UserName'],
                NomUser=data['NomUser'],
                ApePatUser=data['ApePatUser'],
                ApeMatUser=data.get('ApeMatUser', ''),
                password=password,
                TipoUser=tipo_user
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Serializar el objeto creado para la respuesta
        response_serializer = UsuarioSerializer(user)

        # 5. Retornar respuesta exitosa
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


    # Modificación del método update (PUT/PATCH) - EDITAR USUARIO
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        password = request.data.pop('password', None) # Quita la contraseña para manejar el hash

        # El serializador maneja la validación de los datos actualizados
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Actualiza el resto de los campos
        self.perform_update(serializer)
        
        # Si se proporcionó una nueva contraseña, la hashea y guarda
        if password:
            instance.set_password(password)
            instance.save() 
            
        return Response(serializer.data)