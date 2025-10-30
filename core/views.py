from django.contrib.auth import authenticate, login
from django.contrib.auth.models import Permission
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.decorators import permission_classes
from rest_framework.response import Response
from rest_framework import status
from .models import Usuario, Carrera, Post
from .serializers import CarreraSerializer
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .serializers import UsuarioSerializer
import json
from rest_framework.decorators import api_view # Necesario para register/login
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import logout as django_logout
from rest_framework.filters import SearchFilter, OrderingFilter
from .serializers import UsuarioSerializer, CarreraSerializer, PostSerializer


# --- VISTAS PÚBLICAS DE AUTENTICACIÓN ---



@csrf_exempt
@api_view(['GET']) 
@permission_classes([permissions.IsAuthenticated])
def check_session(request):
    """
    Verifica si la cookie de sesión es válida. Si lo es, retorna los datos del usuario.
    Requiere que el usuario esté autenticado.
    """
    user = request.user
    return Response({
        'isAuthenticated': True,
        'TipoUser': user.TipoUser,
        'is_superuser': user.is_superuser,
        'UserName': user.UserName,
        'is_profile_complete': user.is_profile_complete
    }, status=status.HTTP_200_OK)

    
@csrf_exempt
@api_view(['POST']) 
def logout_user(request):
    """Mata la sesión de Django."""
    if request.user.is_authenticated:
        django_logout(request)
        return Response({'message': 'Sesión cerrada exitosamente.'}, status=status.HTTP_200_OK)
    return Response({'error': 'No hay sesión activa.'}, status=status.HTTP_400_BAD_REQUEST)

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
                    'is_superuser': user.is_superuser,
                    'is_profile_complete': user.is_profile_complete
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

class UserProfileUpdate(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        user = request.user

        carrera_id = request.data.get('carrera_id')
        

        try:
            if carrera_id:
                user.idCarrera_id = carrera_id
            
            user.is_profile_complete = True
            user.save()

            return Response({'message': 'Perfil actualizado exitosamente'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CarreraViewSet(viewsets.ModelViewSet):
    queryset = Carrera.objects.all().order_by('idCarrera')
    serializer_class = CarreraSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [permissions.IsAdminUser]
        else:
            self.permission_classes = [permissions.IsAuthenticated]
        return [Permission()for Permission in self.permission_classes]

class IsOwnerOrAdmin(permissions.BasePermission):
    """Permite editar/eliminar solo al autor o usuarios admin/superuser."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_authenticated:
            # El autor de la publicación
            if obj.idUser == request.user:
                return True
            # Usuarios Admin o Superuser pueden borrar/editar
            if request.user.TipoUser == 'Admin' or request.user.is_superuser:
                return True
        return False

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all().order_by('-FechCreacPost')
    serializer_class = PostSerializer
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['TextPost', 'idUser__UserName'] # Búsqueda por texto y nombre de autor
    ordering_fields = ['FechCreacPost']

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsOwnerOrAdmin()]
        elif self.action in ['create','list','retrieve']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        # Asignar el usuario que hace la publicación como autor
        serializer.save(idUser=self.request.user)