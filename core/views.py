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
from .models import Comentario
from .serializers import ComentarioSerializer
from .models import MensajeDirecto
from .serializers import MensajeDirectoSerializer
from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_decode
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator
from .serializers import UsuarioExplorarSerializer
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q


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

    def get_permissions(self):
        # Solo permito a admins crear, actualizar o borrar, pero cualquiera autenticado puede listar y ver
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdminOrSuperUser]
        else:  # 'list', 'retrieve'
            self.permission_classes = [permissions.IsAuthenticated]
        return [perm() for perm in self.permission_classes]

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

class IsOwnerOrAdminComentario(permissions.BasePermission):
    """Permite editar/eliminar solo al autor o admin."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_authenticated:
            if obj.idUser == request.user:
                return True
            if request.user.TipoUser == 'Admin' or request.user.is_superuser:
                return True
        return False

class ComentarioViewSet(viewsets.ModelViewSet):
    queryset = Comentario.objects.all().order_by('FechCreacComen')
    serializer_class = ComentarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Permite filtrar por idPost
        post_id = self.request.query_params.get('idPost')
        qs = super().get_queryset()
        if post_id:
            qs = qs.filter(idPost__idPost=post_id)
        return qs

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsOwnerOrAdminComentario()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(idUser=self.request.user)

class IsInvolvedOrAdminMensaje(permissions.BasePermission):
    """Solo el emisor, receptor o admin/superuser pueden ver/interactuar."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_authenticated:
            if obj.sendUser == request.user or obj.receiveUser == request.user:
                return True
            if request.user.TipoUser == 'Admin' or request.user.is_superuser:
                return True
        return False

class MensajeDirectoViewSet(viewsets.ModelViewSet):
    queryset = MensajeDirecto.objects.all().order_by('-FechMensaje')
    serializer_class = MensajeDirectoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Solo ve mensajes donde participa
        qs = qs.filter(models.Q(sendUser=user) | models.Q(receiveUser=user))
        # Opcional: filtrar por otro usuario para chat exclusivo
        other_id = self.request.query_params.get('user')
        if other_id:
            qs = qs.filter(models.Q(sendUser__idUser=other_id) | models.Q(receiveUser__idUser=other_id))
        return qs

    def get_permissions(self):
        if self.action in ['destroy', 'update', 'partial_update']:
            return [IsInvolvedOrAdminMensaje()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        data = self.request.data
        # Identifica receptor por id, evita que el usuario mande a sí mismo (opcional)
        rec_id = data.get('receiveUser')
        from .models import Usuario
        receptor = Usuario.objects.get(idUser=rec_id)
        serializer.save(sendUser=user, receiveUser=receptor)

@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetRequestAPIView(APIView):
    """
    POST: { "email": "algo@correo.com" }
    Envía correo con enlace de recuperación si existe el usuario.
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        User = get_user_model()
        try:
            user = User.objects.get(CorreoUser__iexact=email)
        except User.DoesNotExist:
            # No revelar si existe (by design)
            return Response({'message': 'Si el correo está registrado, se enviará un enlace para restablecer la contraseña.'}, status=status.HTTP_200_OK)
        # Generar link seguro
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        reset_link = f"{frontend_url}/password-reset/confirm?uid={uid}&token={token}"
        # Enviar correo
        send_mail(
            subject="Restablecimiento de contraseña",
            message=f"Hola {user.UserName},\n\nPara restablecer tu contraseña, haz clic en el siguiente enlace:\n{reset_link}\n\nSi no solicitaste esto, ignora este correo.",
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@upeapp.com'),
            recipient_list=[user.CorreoUser],
            fail_silently=False,
        )
        return Response({'message': 'Si el correo está registrado, se enviará un enlace para restablecer la contraseña.'}, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetConfirmAPIView(APIView):
    """
    POST: { "uid": "...", "token": "...", "new_password": "nueva" }
    Valida token y cambia la contraseña.
    """
    permission_classes = []
    authentication_classes = []
    def post(self, request):
        uidb64 = request.data.get('uid', '')
        token = request.data.get('token', '')
        new_password = request.data.get('new_password')
        User = get_user_model()
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Enlace de restablecimiento inválido.'}, status=400)
        if not default_token_generator.check_token(user, token):
            return Response({'error': 'El enlace o token es inválido o expiró.'}, status=400)
        if not new_password or len(new_password) < 6:
            return Response({'error': 'La nueva contraseña debe tener al menos 6 caracteres.'}, status=400)
        try:
            user.set_password(new_password)
            user.save()
        except ValidationError as e:
            return Response({'error': str(e)}, status=400)
        return Response({'message': '¡Contraseña restablecida correctamente!'}, status=200)

class MiPerfilView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]
    def get(self, request):
        serializer = UsuarioSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        serializer = UsuarioSerializer(user, data=request.data, partial=False, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def patch(self, request):
        user = request.user
        serializer = UsuarioSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class PerfilPublicoView(APIView):
    def get(self, request, username):
        usuario = get_object_or_404(Usuario, UserName=username, is_profile_public=True)
        serializer = UsuarioSerializer(usuario, context={'request': request})
        data = serializer.data
        if not usuario.show_posts_public:
            data['show_posts_public'] = False
        if not usuario.mostrar_contacto:
            data['info_contacto'] = None
        return Response(data)

class UsuarioExplorarPagination(PageNumberPagination):
    page_size = 12

class ExplorarUsuariosView(APIView):
    def get(self, request):
        query = request.GET.get('search','').strip()
        qs = Usuario.objects.filter(is_profile_public=True)
        if query:
            qs = qs.filter(Q(UserName__icontains=query) | Q(NomUser__icontains=query) | Q(ApePatUser__icontains=query) | Q(descripcion__icontains=query))
        qs = qs.order_by('-FechUnido')
        paginator = UsuarioExplorarPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = UsuarioExplorarSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)