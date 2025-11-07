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
from .models import Notificacion
from rest_framework.decorators import action
from .models import Grupo, UsuarioGrupo
from .serializers import GrupoSerializer, UsuarioGrupoSerializer
from core.autenticacion import CsrfExemptSessionAuthentication
from rest_framework.parsers import JSONParser
from .models import Evento, UsuarioEvento
from .serializers import EventoSerializer, UsuarioEventoSerializer
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
import requests
from django.utils import timezone
from .models import Chatbot
from django.http import HttpResponse
from rest_framework.permissions import IsAdminUser
from .serializers import AlertaIASerializer
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count, Q, Avg, Sum
from django.utils.timezone import make_aware
from datetime import datetime, timedelta
from django.apps import apps
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import RecursoApoyo
from .serializers import RecursoApoyoSerializer
from django.db.models import Count, Sum, F
import subprocess
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAdminUser
from django.http import FileResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
import os
from django.contrib.auth.decorators import login_required


# --- VISTAS PÚBLICAS DE AUTENTICACIÓN ---



@csrf_exempt
@api_view(['GET']) 
@permission_classes([permissions.IsAuthenticated])
def check_session(request):
    """
    Verifica si la cookie de sesión es válida. Si lo es, retorna los datos del usuario y SU ID.
    Requiere que el usuario esté autenticado.
    """
    user = request.user
    return Response({
        'isAuthenticated': True,
        'idUser': user.idUser,  # <----- Agregado el id
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
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        from .models import Usuario
        if Usuario.objects.filter(idCarrera=instance).exists():
            return Response({'error': 'No se puede eliminar la carrera porque existen usuarios asignados.'}, status=400)
        return super().destroy(request, *args, **kwargs)

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
    search_fields = ['TextPost', 'idUser__UserName']
    ordering_fields = ['FechCreacPost']
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user if self.request.user.is_authenticated else None
        # Filtro por publicaciones públicas, admins ven todo, dueño ve todo
        if not user:
            return qs.none()
        if user.is_superuser or getattr(user, 'TipoUser', '') == 'Admin':
            return qs
        # Si filtra por usuario, primero verifica si te deja ver
        usuario_id = self.request.query_params.get('idUser')
        if usuario_id:
            try:
                owner = Usuario.objects.get(idUser=usuario_id)
                if owner.idUser == user.idUser:
                    return qs.filter(idUser=owner)
                elif owner.show_posts_public:
                    return qs.filter(idUser=owner)
                else:
                    return qs.none()
            except Usuario.DoesNotExist:
                return qs.none()
        # Por defecto: mostrar solo posts de usuarios que sí quieren mostrar
        visibles = [u.idUser for u in Usuario.objects.filter(show_posts_public=True)]
        return qs.filter(models.Q(idUser__in=visibles) | models.Q(idUser=user))

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsOwnerOrAdmin()]
        elif self.action in ['create','list','retrieve']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        post = serializer.save(idUser=self.request.user)
        # Analizar el texto con Gemini
        from django.conf import settings
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        score = 0.0
        label = ''
        alerta = False
        if post.TextPost:
            score, label, alerta = analiza_texto_con_gemini(post.TextPost, api_key)
            post.SentimientoScore = score
            post.SentimientoLabel = label
            post.AlertaIA = alerta
            post.save(update_fields=["SentimientoScore","SentimientoLabel","AlertaIA"])
        # Trigger notificación solo si hay alerta seria
        if alerta:
            admins = Usuario.objects.filter(models.Q(TipoUser='Admin') | models.Q(is_superuser=True))
            for admin in admins:
                Notificacion.objects.create(
                    idUser=admin,
                    TipoNot='ALERTA IA',
                    MensajeNot=f'Alerta emocional automática: posible caso de "{label}" (score={score}) en publicación de {self.request.user.UserName}: "{post.TextPost[:70]}..."',
                    TipoEntrega='web',
                )
        # Notificación normal a usuarios (como antes)
        usuarios = Usuario.objects.exclude(idUser=self.request.user.idUser)
        Notificacion.objects.bulk_create([
            Notificacion(
                idUser=u,
                TipoNot='Publicación',
                MensajeNot=f'Nueva publicación de {self.request.user.UserName}: "{post.TextPost[:64]}"',
                TipoEntrega='web',
            ) for u in usuarios
        ])

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
        comentario = serializer.save(idUser=self.request.user)
        from django.conf import settings
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        score = 0.0
        label = ''
        alerta = False
        if comentario.TextComentario:
            score, label, alerta = analiza_texto_con_gemini(comentario.TextComentario, api_key)
            comentario.SentimientoScoreCom = score
            comentario.SentimientoLabelCom = label
            comentario.AlertaIACom = alerta
            comentario.save(update_fields=["SentimientoScoreCom","SentimientoLabelCom","AlertaIACom"])
        if alerta:
            admins = Usuario.objects.filter(models.Q(TipoUser='Admin') | models.Q(is_superuser=True))
            for admin in admins:
                Notificacion.objects.create(
                    idUser=admin,
                    TipoNot='ALERTA IA',
                    MensajeNot=f'Alerta emocional automática en comentario: posible "{label}" (score={score}) de {self.request.user.UserName}: "{comentario.TextComentario[:70]}..."',
                    TipoEntrega='web',
                )

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
        qs = qs.filter(Q(sendUser=user) | Q(receiveUser=user))
        # Opcional: filtrar por otro usuario para chat exclusivo
        other_id = self.request.query_params.get('user')
        if other_id:
            qs = qs.filter(Q(sendUser__idUser=other_id) | Q(receiveUser__idUser=other_id))
        return qs

    def get_permissions(self):
        if self.action in ['destroy', 'update', 'partial_update']:
            return [IsInvolvedOrAdminMensaje()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        data = self.request.data
        rec_id = data.get('receiveUser')
        from .models import Usuario
        receptor = Usuario.objects.get(idUser=rec_id)
        msg = serializer.save(sendUser=user, receiveUser=receptor)
        # Notificar al receptor
        Notificacion.objects.create(
            idUser=receptor,
            TipoNot='Mensaje',
            MensajeNot=f'Nuevo mensaje de {user.UserName}: "{msg.Mensaje[:64]}"',
            TipoEntrega='web',
        )
        # Analizar el mensaje con Gemini
        from django.conf import settings
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        score = 0.0
        label = ''
        alerta = False
        if msg.Mensaje:
            score, label, alerta = analiza_texto_con_gemini(msg.Mensaje, api_key)
            msg.SentimientoScore = score
            msg.SentimientoLabel = label
            msg.AlertaIAMsgDirecto = alerta
            msg.save(update_fields=["SentimientoScore","SentimientoLabel","AlertaIAMsgDirecto"])
        if alerta:
            admins = Usuario.objects.filter(models.Q(TipoUser='Admin') | models.Q(is_superuser=True))
            for admin in admins:
                Notificacion.objects.create(
                    idUser=admin,
                    TipoNot='ALERTA IA',
                    MensajeNot=f'Alerta emocional automática: posible "{label}" (score={score}) en mensaje directo de {self.request.user.UserName} hacia {msg.receiveUser.UserName}: "{msg.Mensaje[:70]}..."',
                    TipoEntrega='web',
                )

    @action(detail=False, methods=['delete'], url_path='borrar_conversacion')
    def borrar_conversacion(self, request):
        """
        Elimina TODOS los mensajes entre el usuario autenticado y el usuario con ID dado (?usuario=xxx)
        """
        other_id = request.query_params.get('usuario')
        if not other_id:
            return Response({'error': 'Falta el usuario.'}, status=400)
        user = request.user
        deleted, _ = MensajeDirecto.objects.filter(
            (Q(sendUser=user) & Q(receiveUser__idUser=other_id)) | (Q(sendUser__idUser=other_id) & Q(receiveUser=user))
        ).delete()
        return Response({'deleted': deleted})

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

# ---- Endpoint para consultar notificaciones ----
class MisNotificacionesView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        notis = Notificacion.objects.filter(idUser=request.user).order_by('-FechEnviado')[:10]
        data = [
            dict(
                id=n.idNotificacion,
                tipo=n.TipoNot,
                mensaje=n.MensajeNot,
                fecha=n.FechEnviado,
                entrega=n.TipoEntrega
            ) for n in notis
        ]
        return Response(data)

class IsGroupAdminOrSuperuser(permissions.BasePermission):
    """Permite administración solo a admins de grupo o admin plataforma."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser or getattr(request.user, 'TipoUser', '') == 'Admin':
            return True
        # Si el usuario es admin del grupo
        return UsuarioGrupo.objects.filter(idGrupo=obj, idUser=request.user, Rol='Admin').exists()

@method_decorator(csrf_exempt, name='dispatch')
class GrupoViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    queryset = Grupo.objects.all().order_by('-FechCreaGrupo')
    serializer_class = GrupoSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['NomGrupo', 'DescGrupo']
    ordering_fields = ['FechCreaGrupo','NomGrupo']

    def get_permissions(self):
        # Permite eliminar grupo a superusers o admin/creador del grupo
        if self.action == 'destroy':
            return [IsGroupAdminOrSuperuser()]
        elif self.action in ['update', 'partial_update']:
            return [IsGroupAdminOrSuperuser()]
        elif self.action in ['create']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        # El creador se agrega como admin y aceptado SIEMPRE
        grupo = serializer.save(idUser=self.request.user)
        UsuarioGrupo.objects.create(idGrupo=grupo, idUser=self.request.user, Rol='Admin', estado='aceptado')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='mis')
    def mis_grupos(self, request):
        from .models import UsuarioGrupo  # Para evitar circular
        ids = UsuarioGrupo.objects.filter(idUser=request.user, estado='aceptado').values_list('idGrupo', flat=True)
        grupos = Grupo.objects.filter(idGrupo__in=ids).distinct()
        page = self.paginate_queryset(grupos)
        if page is not None:
            s = GrupoSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(s.data)
        s = GrupoSerializer(grupos, many=True, context={'request': request})
        return Response(s.data)

    @action(detail=True, methods=['post'], url_path='unirse')
    def unirse(self, request, pk=None):
        grupo = self.get_object()
        if UsuarioGrupo.objects.filter(idGrupo=grupo, idUser=request.user).exists():
            return Response({'error': 'Ya tienes una membresía activa o pendiente en este grupo.'}, status=400)
        estado = 'aceptado' if grupo.PrivGrupo == 'Publico' else 'pendiente'
        UsuarioGrupo.objects.create(idGrupo=grupo, idUser=request.user, Rol='Miembro', estado=estado)
        if estado == 'pendiente':
            return Response({'status': 'Solicitud enviada, espera aprobación del admin.'})
        return Response({'status': 'Unido exitosamente.'})

    @action(detail=True, methods=['post'], url_path='salir')
    def salir(self, request, pk=None):
        grupo = self.get_object()
        instancia = UsuarioGrupo.objects.filter(idGrupo=grupo, idUser=request.user).first()
        if instancia:
            instancia.delete()
            return Response({'status': 'Has salido del grupo.'})
        return Response({'error': 'No eres miembro.'}, status=400)

    @action(detail=True, methods=['get'], url_path='miembros')
    def miembros(self, request, pk=None):
        grupo = self.get_object()
        usuarios = UsuarioGrupo.objects.filter(idGrupo=grupo, estado='aceptado')
        page = self.paginate_queryset(usuarios)
        if page is not None:
            s = UsuarioGrupoSerializer(page, many=True)
            return self.get_paginated_response(s.data)
        s = UsuarioGrupoSerializer(usuarios, many=True)
        return Response(s.data)

    @action(detail=True, methods=['get'], url_path='pendientes')
    def pendientes(self, request, pk=None):
        """Ver miembros que están en estado 'pendiente' del grupo."""
        grupo = self.get_object()
        if not IsGroupAdminOrSuperuser().has_object_permission(request, self, grupo):
            return Response({'error': 'No tienes permisos para ver solicitudes.'}, status=403)
        pendientes = UsuarioGrupo.objects.filter(idGrupo=grupo, estado='pendiente')
        return Response(UsuarioGrupoSerializer(pendientes, many=True).data)

    @action(detail=True, methods=['post'], url_path='aceptar_miembro')
    def aceptar_miembro(self, request, pk=None):
        grupo = self.get_object()
        if not IsGroupAdminOrSuperuser().has_object_permission(request, self, grupo):
            return Response({'error': 'No tienes permisos.'}, status=403)
        user_id = request.data.get('idUser')
        try:
            mem = UsuarioGrupo.objects.get(idGrupo=grupo, idUser__idUser=user_id, estado='pendiente')
            mem.estado = 'aceptado'
            mem.save()
            return Response({'status': 'Miembro aceptado.'})
        except UsuarioGrupo.DoesNotExist:
            return Response({'error': 'No encontrado.'}, status=404)

    @action(detail=True, methods=['post'], url_path='rechazar_miembro')
    def rechazar_miembro(self, request, pk=None):
        grupo = self.get_object()
        if not IsGroupAdminOrSuperuser().has_object_permission(request, self, grupo):
            return Response({'error': 'No tienes permisos.'}, status=403)
        user_id = request.data.get('idUser')
        try:
            mem = UsuarioGrupo.objects.get(idGrupo=grupo, idUser__idUser=user_id, estado='pendiente')
            mem.delete()
            return Response({'status': 'Membresía rechazada y eliminada.'})
        except UsuarioGrupo.DoesNotExist:
            return Response({'error': 'No encontrado.'}, status=404)

    @action(detail=True, methods=['post'], url_path='cambiar_rol')
    def cambiar_rol(self, request, pk=None):
        grupo = self.get_object()
        if not IsGroupAdminOrSuperuser().has_object_permission(request, self, grupo):
            return Response({'error': 'No tienes permisos para esto.'}, status=403)
        user_id = request.data.get('idUser')
        nuevo_rol = request.data.get('rol')
        if not user_id or nuevo_rol not in ['Miembro', 'Admin']:
            return Response({'error': 'Datos inválidos.'}, status=400)
        try:
            mem = UsuarioGrupo.objects.get(idGrupo=grupo, idUser__idUser=user_id)
            mem.Rol = nuevo_rol
            mem.save()
            return Response({'status': 'Rol actualizado.'})
        except UsuarioGrupo.DoesNotExist:
            return Response({'error': 'No es miembro.'}, status=404)

    @action(detail=True, methods=['post'], url_path='expulsar')
    def expulsar(self, request, pk=None):
        grupo = self.get_object()
        if not IsGroupAdminOrSuperuser().has_object_permission(request, self, grupo):
            return Response({'error': 'No tienes permisos para esto.'}, status=403)
        user_id = request.data.get('idUser')
        try:
            mem = UsuarioGrupo.objects.get(idGrupo=grupo, idUser__idUser=user_id)
            mem.delete()
            return Response({'status': 'Miembro expulsado.'})
        except UsuarioGrupo.DoesNotExist:
            return Response({'error': 'No encontrado.'}, status=404)

class IsEventoCreadorOrAdmin(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        return request.user.is_superuser or obj.creador == request.user

@method_decorator(csrf_exempt, name='dispatch')
class EventoViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    queryset = Evento.objects.all().order_by('FechEvent')
    serializer_class = EventoSerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['TituloEvent', 'DescEvent', 'LugarEvent']
    ordering_fields = ['FechEvent']

    def get_permissions(self):
        if self.action in ['create']:
            return [IsAdminUser()]
        elif self.action in ['update','partial_update','destroy']:
            return [IsEventoCreadorOrAdmin()]
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        serializer.save(creador=self.request.user)

    @action(detail=True, methods=['post'], url_path='inscribir')
    def inscribir(self, request, pk=None):
        evento = self.get_object()
        user = request.user
        if UsuarioEvento.objects.filter(idEvento=evento, idUser=user).exists():
            return Response({'error':'Ya registrado en este evento.'}, status=400)
        UsuarioEvento.objects.create(idEvento=evento, idUser=user, tipo='asistencia')
        return Response({'status': 'Inscripción exitosa.'})

    @action(detail=True, methods=['post'], url_path='desinscribir')
    def desinscribir(self, request, pk=None):
        evento = self.get_object()
        user = request.user
        reg = UsuarioEvento.objects.filter(idEvento=evento, idUser=user).first()
        if reg:
            reg.delete()
            return Response({'status': 'Inscripción cancelada.'})
        return Response({'error':'No estabas inscrito.'}, status=400)

    @action(detail=True, methods=['get'], url_path='asistentes')
    def asistentes(self, request, pk=None):
        evento = self.get_object()
        asistentes = UsuarioEvento.objects.filter(idEvento=evento)
        data = UsuarioEventoSerializer(asistentes, many=True).data
        return Response(data)

    @action(detail=False, methods=['get'], url_path='mis')
    def mis_eventos(self, request):
        ue = UsuarioEvento.objects.filter(idUser=request.user).values_list('idEvento', flat=True)
        eventos = Evento.objects.filter(idEvento__in=ue)
        page = self.paginate_queryset(eventos)
        s = EventoSerializer(page, many=True, context={'request': request}) if page is not None else EventoSerializer(eventos, many=True, context={'request': request})
        return self.get_paginated_response(s.data) if page is not None else Response(s.data)

def consulta_huggingface(prompt, history, api_key, model):
    import requests
    url = f'https://api-inference.huggingface.co/models/{model}'
    headers = {"Authorization": f"Bearer {api_key}"}
    data = {"inputs": prompt}
    try:
        r = requests.post(url, headers=headers, json=data, timeout=13)
        if r.status_code == 200:
            result = r.json()
            # Algunos modelos regresan un array, otros un string
            if isinstance(result, list) and len(result) > 0:
                respuesta = result[0].get('generated_text', '')
            elif isinstance(result, dict) and 'generated_text' in result:
                respuesta = result['generated_text']
            elif isinstance(result, dict) and 'error' in result:
                respuesta = '[HF ERROR]: ' + str(result['error'])
            else:
                respuesta = str(result)
            return respuesta.strip()
        else:
            print('[HF ERROR]', r.status_code, r.text)
            return 'No fue posible responder (modelo ocupado/fin de cuota).'
    except Exception as e:
        print('[HF EXCEP]:', e)
        return 'No fue posible responder (error de conexión).'

class ChatbotAPIView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = []
    def post(self, request):
        user = request.user if hasattr(request, 'user') and getattr(request.user, 'is_authenticated', False) else None
        mensaje = request.data.get('mensaje', '')
        history = request.data.get('history', [])
        from django.conf import settings
        api_key = getattr(settings, 'HUGGINGFACE_API_KEY', None)
        model = getattr(settings, 'HUGGINGFACE_CHAT_MODEL', 'HuggingFaceH4/zephyr-7b-beta')
        if not api_key:
            return Response({'error': 'HuggingFace API Key no configurada en settings.'}, status=500)
        if not mensaje.strip():
            return Response({'error': 'Mensaje vacío.'}, status=400)
        system_prompt = "Eres un chatbot de apoyo emocional para estudiantes universitarios. Ayuda, orienta y responde con empatía. Si detectas tristeza o crisis, brinda orientación básica."
        prompt = system_prompt + "\nEstudiante: " + mensaje
        respuesta_ia = consulta_huggingface(prompt, history, api_key, model)
        # El resto igual que antes (puedes añadir análisis IA, logs y notas a la BD)
        return Response({'respuesta': respuesta_ia})

def consulta_openai(mensaje, history, api_key):
    url = "https://api.openai.com/v1/chat/completions"
    messages = [{"role": "system", "content": "Eres un chatbot de apoyo emocional para estudiantes universitarios. Ayuda, orienta y responde con empatía. Detecta emociones y sugiere recursos básicos si recibes mensajes de tristeza/crisis. No reemplazas atención psicológica profesional."}]
    for turno in history:
        if "role" in turno and "content" in turno:
            messages.append({"role": turno["role"], "content": turno["content"]})
        else:
            messages.append({"role": "user", "content": str(turno)})
    messages.append({"role": "user", "content": mensaje})
    data = {
        "model": "gpt-3.5-turbo",  # Cambia a gpt-4 si tienes acceso
        "messages": messages,
        "max_tokens": 512,
        "temperature": 0.7,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    r = requests.post(url, json=data, headers=headers, timeout=15)
    if r.status_code == 200:
        respuesta = r.json()["choices"][0]["message"]["content"].strip()
        return respuesta
    else:
        return f"[Error OpenAI]: {r.text}"

import requests

def analiza_texto_con_gemini(texto, api_key):
    import requests
    import json
    import re
    prompt = (
        "Eres un detector emocional experto. Analiza el siguiente texto. Responde SOLO y ESTRICTAMENTE en formato JSON en una sola línea (sin explicación, sin saltos de línea, sin comentarios, sin preámbulo antes ni después), con las llaves: label, score, suicidio. Donde 'label' es la emoción/categoría detectada (ej. suicidio, depresión, ansiedad, tristeza, etc.), 'score' es un número entre -1 y 1 representando la gravedad, y 'suicidio' es true/false si hay riesgo."
        "Ejemplo de salida: {\"label\":\"suicidio\",\"score\":-0.99,\"suicidio\":true}. Texto: " + texto
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={api_key}"
    messages = [{"role": "user", "parts": [{"text": prompt}]}]
    data = {"contents": messages}
    try:
        r = requests.post(url, json=data, timeout=12)
        if r.status_code == 200 and 'candidates' in r.json():
            response = r.json()['candidates'][0]['content']['parts'][0]['text']
            print("[Gemini DEBUG] RESPUESTA RAW:", repr(response))
            # Extrae el primer {...} JSON válido
            matches = re.findall(r'\{.*?\}', response.replace('\n',' ').replace('\r',' '))
            for m in matches:
                try:
                    res = json.loads(m)
                    label = res.get('label','')
                    score = float(res.get('score',0))
                    suicidio = res.get('suicidio',False)
                    return score, label, bool(suicidio)
                except Exception:
                    continue
            print("[Gemini DEBUG] ERROR DE PARSEO JSON!", response)
        else:
            print("[Gemini DEBUG] STATUS O JSON INESPERADO:", r.status_code, r.text)
        return 0.0, 'desconocido', False
    except Exception as ex:
        print("[Gemini DEBUG] EXCEPTION:", ex)
        return 0.0, 'error', False

def consulta_gemini(prompt, history, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={api_key}"
    messages = [{"role": "user", "parts": [{"text": prompt}]}]
    data = {"contents": messages}
    try:
        r = requests.post(url, json=data, timeout=12)
        if r.status_code == 200:
            res = r.json()
            # Se espera que la respuesta esté en res['candidates'][0]['content']['parts'][0]['text']
            if (
                'candidates' in res
                and res['candidates']
                and 'content' in res['candidates'][0]
                and 'parts' in res['candidates'][0]['content']
                and res['candidates'][0]['content']['parts']
                and 'text' in res['candidates'][0]['content']['parts'][0]
                ):
                return res['candidates'][0]['content']['parts'][0]['text']
            else:
                return '[Error IA]: Respuesta inesperada de Gemini.'
        else:
            # Intenta mostrar el error amigable
            try:
                err = r.json()
                if ('error' in err) and (isinstance(err['error'], dict)):
                    msg = err['error'].get('message', str(err))
                    if err['error'].get('status','').upper() in ['UNAVAILABLE','RESOURCE_EXHAUSTED'] or 'overloaded' in msg.lower():
                        return 'El chatbot está temporalmente saturado. Intenta de nuevo más tarde.'
                    return f"[Error IA]: {msg}"
            except Exception:
                pass
            return f"[Error IA]: {r.text}"
    except Exception as exc:
        return f"[Error excep]: {exc}"

@csrf_exempt
def test_dummy(request):
    return HttpResponse("ok", status=200)

class IsSuperuserOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and (request.user.is_superuser or getattr(request.user, 'TipoUser', '') == 'Admin')

class AlertaIAPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'

class AlertaIAAPIView(APIView):
    permission_classes = [IsSuperuserOrAdmin]
    def get(self, request):
        tipo = request.query_params.get('tipo')  # post, comentario, mensaje, chatbot
        label = request.query_params.get('label')
        score_min = float(request.query_params.get('score_min', -2))
        score_max = float(request.query_params.get('score_max', 2))
        usuario_id = request.query_params.get('idUser')
        mostrar_todo = request.query_params.get('mostrar_todo') == '1'
        resultados = []
        # Posts
        if not tipo or tipo == 'post':
            from .models import Post
            qs = Post.objects.all() if mostrar_todo else Post.objects.filter(AlertaIA=True)
            qs = qs.filter(SentimientoScore__isnull=False, SentimientoScore__gte=score_min, SentimientoScore__lte=score_max).order_by('-FechCreacPost')
            if label: qs = qs.filter(SentimientoLabel__icontains=label)
            if usuario_id: qs = qs.filter(idUser__idUser=usuario_id)
            for p in qs:
                resultados.append({
                    'tipo':'post','id':p.idPost,'usuario':str(p.idUser.UserName),'texto':p.TextPost or '',
                    'score': p.SentimientoScore, 'label': p.SentimientoLabel,
                    'fecha': p.FechCreacPost, 'extra': { 'alerta': p.AlertaIA }
                })
        # Comentarios
        if not tipo or tipo == 'comentario':
            from .models import Comentario
            cs = Comentario.objects.all() if mostrar_todo else Comentario.objects.filter(AlertaIACom=True)
            cs = cs.filter(SentimientoScoreCom__isnull=False, SentimientoScoreCom__gte=score_min, SentimientoScoreCom__lte=score_max).order_by('-FechCreacComen')
            if label: cs = cs.filter(SentimientoLabelCom__icontains=label)
            if usuario_id: cs = cs.filter(idUser__idUser=usuario_id)
            for c in cs:
                resultados.append({
                    'tipo':'comentario','id':c.idComentario,'usuario':str(c.idUser.UserName),'texto':c.TextComentario or '',
                    'score': c.SentimientoScoreCom, 'label':c.SentimientoLabelCom,
                    'fecha': c.FechCreacComen, 'extra': {'idPost': c.idPost_id, 'alerta': c.AlertaIACom}
                })
        # Mensajes directos
        if not tipo or tipo == 'mensaje':
            from .models import MensajeDirecto
            ms = MensajeDirecto.objects.all() if mostrar_todo else MensajeDirecto.objects.filter(AlertaIAMsgDirecto=True)
            ms = ms.filter(SentimientoScore__isnull=False, SentimientoScore__gte=score_min, SentimientoScore__lte=score_max).order_by('-FechMensaje')
            if label: ms = ms.filter(SentimientoLabel__icontains=label)
            if usuario_id: ms = ms.filter(sendUser__idUser=usuario_id)
            for m in ms:
                resultados.append({
                    'tipo':'mensaje','id':m.idMensajeDirecto,'usuario':str(m.sendUser.UserName),'texto':m.Mensaje or '',
                    'score': m.SentimientoScore, 'label':m.SentimientoLabel,
                    'fecha': m.FechMensaje, 'extra': {'para': m.receiveUser.UserName, 'alerta': m.AlertaIAMsgDirecto}
                })
        # Chatbot
        if not tipo or tipo == 'chatbot':
            from .models import Chatbot
            bs = Chatbot.objects.all() if mostrar_todo else Chatbot.objects.filter(AlertaIAChat=True)
            bs = bs.filter(SentimientoScore__isnull=False, SentimientoScore__gte=score_min, SentimientoScore__lte=score_max).order_by('-FechInterac')
            if label: bs = bs.filter(SentimientoLabel__icontains=label)
            if usuario_id: bs = bs.filter(idUser__idUser=usuario_id)
            for b in bs:
                resultados.append({
                    'tipo':'chatbot','id':b.idChatbot,'usuario':str(b.idUser.UserName if b.idUser else ''),'texto':b.UserQuery or '',
                    'score': b.SentimientoScore, 'label':b.SentimientoLabel,
                    'fecha': b.FechInterac, 'extra': {'respuesta': b.Response, 'alerta': b.AlertaIAChat}
                })
        resultados = sorted(resultados, key=lambda x: x['fecha'], reverse=True)
        paginator = AlertaIAPagination()
        page = paginator.paginate_queryset(resultados, request)
        serializer = AlertaIASerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

class ReporteActividadUsuariosView(APIView):
    """
    GET /api/reportes/actividad_usuarios/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    Responde:
    - actividad_diaria: [{'fecha': 'YYYY-MM-DD', 'posts': N, 'comentarios': M, 'total': X} ...]
    - actividad_tipo_usuario: {'Estudiante': X, 'Profesor': Y, 'Admin': Z}
    """
    def get(self, request, *args, **kwargs):
        Usuario = apps.get_model('core', 'Usuario')
        Post = apps.get_model('core', 'Post')
        Comentario = apps.get_model('core', 'Comentario')

        # Filtros de fecha
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        try:
            if date_from:
                date_from = make_aware(datetime.strptime(date_from, '%Y-%m-%d'))
            if date_to:
                date_to = make_aware(datetime.strptime(date_to, '%Y-%m-%d')) + timedelta(days=1)
        except Exception:
            return Response({'error': 'Formato de fecha inválido, usa YYYY-MM-DD'}, status=400)

        filtro_post = {}
        filtro_com = {}
        if date_from:
            filtro_post['FechCreacPost__gte'] = date_from
            filtro_com['FechCreacComen__gte'] = date_from
        if date_to:
            filtro_post['FechCreacPost__lt'] = date_to
            filtro_com['FechCreacComen__lt'] = date_to

        # Actividad por día
        posts = Post.objects.filter(**filtro_post).values('FechCreacPost__date').annotate(posts=Count('idPost'))
        coms = Comentario.objects.filter(**filtro_com).values('FechCreacComen__date').annotate(comentarios=Count('idComentario'))
        actividad = {}
        for p in posts:
            d = p['FechCreacPost__date'].isoformat() if hasattr(p['FechCreacPost__date'], 'isoformat') else str(p['FechCreacPost__date'])
            actividad.setdefault(d, {'fecha': d, 'posts': 0, 'comentarios': 0, 'total': 0})
            actividad[d]['posts'] = p['posts']
        for c in coms:
            d = c['FechCreacComen__date'].isoformat() if hasattr(c['FechCreacComen__date'], 'isoformat') else str(c['FechCreacComen__date'])
            actividad.setdefault(d, {'fecha': d, 'posts': 0, 'comentarios': 0, 'total': 0})
            actividad[d]['comentarios'] = c['comentarios']
        for d in actividad:
            actividad[d]['total'] = actividad[d]['posts'] + actividad[d]['comentarios']
        actividad_diaria = sorted(actividad.values(), key=lambda x:x['fecha'])

        # Actividad por tipo de usuario:
        posts_tipo = Post.objects.filter(**filtro_post).values('idUser__TipoUser').annotate(posts=Count('idPost'))
        coms_tipo = Comentario.objects.filter(**filtro_com).values('idUser__TipoUser').annotate(comentarios=Count('idComentario'))
        actividad_tipo = {}
        for r in posts_tipo:
            actividad_tipo.setdefault(r['idUser__TipoUser'], 0)
            actividad_tipo[r['idUser__TipoUser']] += r['posts']
        for r in coms_tipo:
            actividad_tipo.setdefault(r['idUser__TipoUser'], 0)
            actividad_tipo[r['idUser__TipoUser']] += r['comentarios']
        return Response({
            'actividad_diaria': actividad_diaria,
            'actividad_tipo_usuario': actividad_tipo,
        })

class ReporteSentimientoPublicacionesView(APIView):
    """
    GET /api/reportes/sentimiento_publicaciones/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD[&label=X][&grupo=ID][&carrera=ID]
    Devuelve:
    - sentimiento_distribucion: {'positivo': X, 'negativo': Y, ...}
    - evolucion: [{'fecha': ..., 'score_promedio': ..., 'total': ...}, ...]
    """
    def get(self, request, *args, **kwargs):
        Post = apps.get_model('core', 'Post')
        Usuario = apps.get_model('core', 'Usuario')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        label = request.GET.get('label')
        grupo = request.GET.get('grupo')
        carrera = request.GET.get('carrera')
        filtro = {}
        if date_from:
            filtro['FechCreacPost__gte'] = date_from
        if date_to:
            filtro['FechCreacPost__lt'] = date_to
        if label:
            filtro['SentimientoLabel__icontains'] = label
        if grupo:
            filtro['idGrupo_id'] = grupo
        if carrera:
            filtro['idUser__idCarrera_id'] = carrera
        qs = Post.objects.filter(**filtro)
        # Distribución de sentimientos
        dist = qs.values('SentimientoLabel').annotate(total=Count('idPost')).order_by('-total')
        sentimiento_distribucion = { d['SentimientoLabel'] or 'sin_label': d['total'] for d in dist }
        # Evolución diaria
        evolucion = qs.values('FechCreacPost__date').annotate(score_promedio=Avg('SentimientoScore'), total=Count('idPost')).order_by('FechCreacPost__date')
        evolucion = [ {'fecha': str(e['FechCreacPost__date']), 'score_promedio': e['score_promedio'], 'total': e['total']} for e in evolucion ]
        return Response({ 'sentimiento_distribucion': sentimiento_distribucion, 'evolucion': evolucion })

class ReporteInteraccionesChatbotView(APIView):
    """
    GET /api/reportes/interacciones_chatbot/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    """
    def get(self, request, *args, **kwargs):
        Chatbot = apps.get_model('core', 'Chatbot')
        filtro = {}
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        if date_from:
            filtro['FechInterac__gte'] = date_from
        if date_to:
            filtro['FechInterac__lt'] = date_to
        qs = Chatbot.objects.filter(**filtro)
        total_interacciones = qs.count()
        usuarios_unicos = qs.values('idUser').distinct().count()
        sentimiento_promedio = qs.aggregate(avg=Avg('SentimientoScore'))['avg']
        # topic principal o palabras clave simples
        if 'Topic' in Chatbot._meta.fields_map:  # Si existe campo Topic
            top_topics = list(qs.values('Topic').annotate(total=Count('idChatbot')).order_by('-total')[:7])
            top_topics = [{'topic': t['Topic'] or 'Sin tópico', 'total': t['total']} for t in top_topics]
        else:
            from collections import Counter
            import re
            words = []
            for c in qs: words += re.findall(r'\w+', (c.UserQuery or '').lower())
            counter = Counter(words)
            top_topics = [{'topic': w, 'total': n} for w, n in counter.most_common(7) if w not in ['de','la','que','el','en','y','a','los','por','con','para','una','su']]
        interacciones_diarias = list(
            qs.values('FechInterac__date').annotate(total=Count('idChatbot')).order_by('FechInterac__date')
        )
        interacciones_diarias = [ {'fecha': str(e['FechInterac__date']), 'total': e['total']} for e in interacciones_diarias ]
        return Response({
            'total_interacciones': total_interacciones,
            'usuarios_unicos': usuarios_unicos,
            'sentimiento_promedio': sentimiento_promedio,
            'top_topics': top_topics,
            'interacciones_diarias': interacciones_diarias,
        })

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and (request.user.is_superuser or getattr(request.user,'TipoUser',None)=='Admin')

class RecursoApoyoViewSet(viewsets.ModelViewSet):
    queryset = RecursoApoyo.objects.all().order_by('-fecha_publicacion')
    serializer_class = RecursoApoyoSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    @action(detail=True, methods=['post'])
    def contar_vista(self, request, pk=None):
        recurso = self.get_object()
        recurso.contador_vistas += 1
        recurso.save(update_fields=['contador_vistas'])
        return Response({'ok':True,'contador_vistas':recurso.contador_vistas})

    @action(detail=True, methods=['post'])
    def contar_descarga(self, request, pk=None):
        recurso = self.get_object()
        recurso.contador_descargas += 1
        recurso.save(update_fields=['contador_descargas'])
        return Response({'ok':True,'contador_descargas':recurso.contador_descargas})

class ReporteRecursosApoyoView(APIView):
    """
    GET /api/reportes/recursos_apoyo/?tipo=...&categoria=...&date_from=...&date_to=...
    """
    def get(self, request, *args, **kwargs):
        RecursoApoyo = apps.get_model('core', 'RecursoApoyo')
        filtro = {}
        tipo = request.GET.get('tipo')
        categoria = request.GET.get('categoria')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        if tipo: filtro['tipo'] = tipo
        if categoria: filtro['categoria'] = categoria
        if date_from: filtro['fecha_publicacion__gte'] = date_from
        if date_to: filtro['fecha_publicacion__lt'] = date_to
        qs = RecursoApoyo.objects.filter(**filtro)
        # Top recursos (por vistas y descargas)
        top_recursos = qs.order_by('-contador_vistas','-contador_descargas')[:15]
        from .serializers import RecursoApoyoSerializer
        top_recursos_dto = RecursoApoyoSerializer(top_recursos, many=True).data
        # Vistas por día
        vistas_dia = list(qs.values('fecha_publicacion__date').annotate(total=Sum('contador_vistas')).order_by('fecha_publicacion__date'))
        vistas_por_dia = [ {'fecha':str(v['fecha_publicacion__date']),'total':v['total']} for v in vistas_dia ]
        # Descargas por día
        descargas_dia = list(qs.values('fecha_publicacion__date').annotate(total=Sum('contador_descargas')).order_by('fecha_publicacion__date'))
        descargas_por_dia = [ {'fecha':str(v['fecha_publicacion__date']),'total':v['total']} for v in descargas_dia ]
        # Distribución por tipo
        dist_tipo = qs.values('tipo').annotate(total=Count('idRecurso')).order_by('-total')
        distribucion_tipo = {d['tipo']:d['total'] for d in dist_tipo}
        # Distribución por categoría
        dist_cat = qs.values('categoria').annotate(total=Count('idRecurso')).order_by('-total')
        distribucion_categoria = {d['categoria'] or 'Sin categoria':d['total'] for d in dist_cat}
        return Response({
            'top_recursos': top_recursos_dto,
            'vistas_por_dia': vistas_por_dia,
            'descargas_por_dia': descargas_por_dia,
            'distribucion_tipo': distribucion_tipo,
            'distribucion_categoria': distribucion_categoria,
        })

class ReporteGruposActivosView(APIView):
    """
    GET /api/reportes/grupos_activos/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD[&tipo=Publico/Privado]
    """
    def get(self, request, *args, **kwargs):
        Grupo = apps.get_model('core', 'Grupo')
        Post = apps.get_model('core', 'Post')
        Comentario = apps.get_model('core', 'Comentario')
        UsuarioGrupo = apps.get_model('core', 'UsuarioGrupo')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        tipo = request.GET.get('tipo')
        filtro_grupo = {}
        if tipo:
            filtro_grupo['PrivGrupo'] = tipo
        grupos = Grupo.objects.filter(**filtro_grupo)
        # TOP grupos por actividad (posts+comentarios)
        top_info = []
        for grupo in grupos:
            filtro_post = {'idGrupo':grupo}
            filtro_com = {'idPost__idGrupo':grupo}
            if date_from: filtro_post['FechCreacPost__gte'] = date_from
            if date_to: filtro_post['FechCreacPost__lt'] = date_to
            if date_from: filtro_com['FechCreacComen__gte'] = date_from
            if date_to: filtro_com['FechCreacComen__lt'] = date_to
            total_posts = Post.objects.filter(**filtro_post).count()
            total_comentarios = Comentario.objects.filter(**filtro_com).count()
            miembros = UsuarioGrupo.objects.filter(idGrupo=grupo, estado='aceptado').count()
            top_info.append({'idGrupo':grupo.idGrupo, 'NomGrupo':grupo.NomGrupo, 'total_posts':total_posts, 'total_comentarios':total_comentarios, 'miembros':miembros, 'PrivGrupo':grupo.PrivGrupo})
        top_grupos = sorted(top_info, key=lambda x: (x['total_posts']+x['total_comentarios']), reverse=True)[:12]

        # Actividad diaria (para los grupos más activos)
        actividad_diaria = []
        for g in top_grupos:
            gpo = grupos.get(idGrupo=g['idGrupo'])
            qs_p = Post.objects.filter(idGrupo=gpo)
            qs_c = Comentario.objects.filter(idPost__idGrupo=gpo)
            if date_from: qs_p = qs_p.filter(FechCreacPost__gte=date_from)
            if date_to: qs_p = qs_p.filter(FechCreacPost__lt=date_to)
            if date_from: qs_c = qs_c.filter(FechCreacComen__gte=date_from)
            if date_to: qs_c = qs_c.filter(FechCreacComen__lt=date_to)
            por_dia = {}
            for p in qs_p.values('FechCreacPost__date').annotate(cnt=Count('idPost')):
                fecha = str(p['FechCreacPost__date'])
                por_dia.setdefault(fecha, {'fecha':fecha,'grupo':g['NomGrupo'],'total_posts':0,'total_comentarios':0})
                por_dia[fecha]['total_posts'] += p['cnt']
            for c in qs_c.values('FechCreacComen__date').annotate(cnt=Count('idComentario')):
                fecha = str(c['FechCreacComen__date'])
                por_dia.setdefault(fecha, {'fecha':fecha,'grupo':g['NomGrupo'],'total_posts':0,'total_comentarios':0})
                por_dia[fecha]['total_comentarios'] += c['cnt']
            actividad_diaria.extend(list(por_dia.values()))
        # Distribución tipo
        dist_tipo = grupos.values('PrivGrupo').annotate(total=Count('idGrupo'))
        distribucion_tipo = {d['PrivGrupo']:d['total'] for d in dist_tipo}
        return Response({
            'top_grupos': top_grupos,
            'actividad_diaria': actividad_diaria,
            'distribucion_tipo': distribucion_tipo
        })

class ReporteEventosMayorAsistenciaView(APIView):
    '''
    GET /api/reportes/eventos_mayor_asistencia/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD[&tipo=fisica/virtual][&estado=vigente][&min_asist=N]
    '''
    def get(self, request, *args, **kwargs):
        Evento = apps.get_model('core', 'Evento')
        UsuarioEvento = apps.get_model('core', 'UsuarioEvento')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        modalidad = request.GET.get('tipo')
        estado = request.GET.get('estado')
        min_asist = request.GET.get('min_asist')
        filtro_evt = {}
        if date_from: filtro_evt['FechEvent__gte'] = date_from
        if date_to: filtro_evt['FechEvent__lt'] = date_to
        if modalidad: filtro_evt['Modalidad'] = modalidad
        if estado: filtro_evt['Estado'] = estado
        eventos = Evento.objects.filter(**filtro_evt)
        # Conteo asistentes
        evento_ids = [e.idEvento for e in eventos]
        asist_counts = UsuarioEvento.objects.filter(idEvento__in=evento_ids).values('idEvento').annotate(asist=Count('idUsuarioEvento')).order_by('-asist')
        count_by_id = {a['idEvento']:a['asist'] for a in asist_counts}
        top_eventos = []
        for e in eventos:
            n = count_by_id.get(e.idEvento,0)
            if min_asist and n < int(min_asist): continue
            top_eventos.append({'idEvento':e.idEvento,'TituloEvent':e.TituloEvent,'Modalidad':e.Modalidad,'Estado':e.Estado,'asistentes':n,'Fecha':e.FechEvent})
        # Top eventos barras
        barras_eventos = sorted(top_eventos, key=lambda t:-t['asistentes'])[:10]
        # Tendencia por fecha
        tendencia = UsuarioEvento.objects.filter(idEvento__in=evento_ids)
        if date_from: tendencia = tendencia.filter(FechRegistro__gte=date_from)
        if date_to: tendencia = tendencia.filter(FechRegistro__lt=date_to)
        tendencia = list(tendencia.values('FechRegistro__date').annotate(total_asistentes_dia=Count('idUsuarioEvento')).order_by('FechRegistro__date'))
        tendencia = [{'fecha':str(t['FechRegistro__date']),'total_asistentes_dia':t['total_asistentes_dia']} for t in tendencia]
        # Distribución por tipo
        dist_tipo = Evento.objects.filter(idEvento__in=evento_ids).values('Modalidad').annotate(total=Count('idEvento'))
        distribucion_tipo = {d['Modalidad']:d['total'] for d in dist_tipo}
        # Distribución por estado
        dist_estado = Evento.objects.filter(idEvento__in=evento_ids).values('Estado').annotate(total=Count('idEvento'))
        distribucion_estado = {d['Estado']:d['total'] for d in dist_estado}
        return Response({
            'top_eventos': top_eventos,
            'barras_eventos': [{'titulo':e['TituloEvent'],'asistentes':e['asistentes']} for e in barras_eventos],
            'tendencia': tendencia,
            'distribucion_tipo': distribucion_tipo,
            'distribucion_estado': distribucion_estado
        })

class ReporteTendenciasCarreraView(APIView):
    '''
    GET /api/reportes/tendencias_carrera/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD[&idCarrera=ID][&tipoMetrica=actividad/sentimiento]
    '''
    def get(self, request, *args, **kwargs):
        Carrera = apps.get_model('core','Carrera')
        Usuario = apps.get_model('core','Usuario')
        Post = apps.get_model('core','Post')
        Comentario = apps.get_model('core','Comentario')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        idCarrera = request.GET.get('idCarrera')
        tipoMetrica = request.GET.get('tipoMetrica','actividad')
        carreras = Carrera.objects.all()
        if idCarrera:
            carreras = carreras.filter(idCarrera=idCarrera)
        resumen = []
        evolucion = []
        for c in carreras:
            ids_users = Usuario.objects.filter(idCarrera=c).values_list('idUser',flat=True)
            filtro_post = {'idUser__in':ids_users}
            filtro_com = {'idUser__in':ids_users}
            if date_from: filtro_post['FechCreacPost__gte'] = date_from
            if date_to: filtro_post['FechCreacPost__lt'] = date_to
            if date_from: filtro_com['FechCreacComen__gte'] = date_from
            if date_to: filtro_com['FechCreacComen__lt'] = date_to
            total_posts = Post.objects.filter(**filtro_post).count()
            total_com = Comentario.objects.filter(**filtro_com).count()
            users_count = Usuario.objects.filter(idCarrera=c).count()
            sent_post_avg = Post.objects.filter(**filtro_post).aggregate(avg=Avg('SentimientoScore'))['avg']
            resumen.append({'idCarrera':c.idCarrera,'NomCarrera':c.NomCarrera,'total_posts':total_posts,'total_comentarios':total_com,'sentimiento_avg':sent_post_avg or 0,'usuarios':users_count})
            # Evolución diaria/área
            qs_p = Post.objects.filter(**filtro_post).values('FechCreacPost__date').annotate(posts=Count('idPost'),sent_avg=Avg('SentimientoScore')).order_by('FechCreacPost__date')
            for e in qs_p:
                evolucion.append({'fecha':str(e['FechCreacPost__date']),'idCarrera':c.idCarrera,'NomCarrera':c.NomCarrera,'posts':e['posts'],'sent_avg':e['sent_avg'],'comentarios':0})
            qs_c = Comentario.objects.filter(**filtro_com).values('FechCreacComen__date').annotate(comments=Count('idComentario')).order_by('FechCreacComen__date')
            for e in qs_c:
                evolucion.append({'fecha':str(e['FechCreacComen__date']),'idCarrera':c.idCarrera,'NomCarrera':c.NomCarrera,'posts':0,'sent_avg':None,'comentarios':e['comments']})
        return Response({'resumen': resumen, 'evolucion': evolucion})

class ReporteNotificacionesView(APIView):
    """
    GET /api/reportes/notificaciones/?tipo=ALERTA&type_entrega=web&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&idUser=N
    """
    def get(self, request, *args, **kwargs):
        Notificacion = apps.get_model('core', 'Notificacion')
        filtro = {}
        tipo = request.GET.get('tipo')
        entrega = request.GET.get('type_entrega')
        usuario = request.GET.get('idUser')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        if tipo: filtro['TipoNot'] = tipo
        if entrega: filtro['TipoEntrega'] = entrega
        if usuario: filtro['idUser__idUser'] = usuario
        if date_from: filtro['FechEnviado__gte'] = date_from
        if date_to: filtro['FechEnviado__lt'] = date_to
        qs = Notificacion.objects.filter(**filtro)
        total = qs.count()
        # Por tipo
        por_tipo = qs.values('TipoNot').annotate(total=Count('idNotificacion')).order_by('-total')
        total_por_tipo = {t['TipoNot']:t['total'] for t in por_tipo}
        # Curva por día
        por_dia = qs.values('FechEnviado__date').annotate(total=Count('idNotificacion')).order_by('FechEnviado__date')
        curva_por_dia = [{'fecha':str(d['FechEnviado__date']),'total':d['total']} for d in por_dia]
        # Por tipo de entrega
        por_entrega = qs.values('TipoEntrega').annotate(total=Count('idNotificacion'))
        distribucion_entrega = {e['TipoEntrega']:e['total'] for e in por_entrega}
        return Response({
            'total_enviadas': total,
            'total_por_tipo': total_por_tipo,
            'curva_por_dia': curva_por_dia,
            'distribucion_entrega': distribucion_entrega
        })

@method_decorator(csrf_exempt, name='dispatch')
class BackupExportView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        path = os.path.join(settings.BASE_DIR, 'backup_tmp.json')
        subprocess.call(['python3', 'manage.py', 'dumpdata', '--natural-foreign', '--natural-primary', '--all', '--indent', '2', '-o', path])
        return FileResponse(open(path, 'rb'), as_attachment=True, filename='respaldo_estadia.json')

class DebugPerm(permissions.BasePermission):
    def has_permission(self, request, view):
        print('DEBUG PERM:', request.user, request.user.is_authenticated, getattr(request.user,'is_superuser',False))
        return request.user.is_authenticated and getattr(request.user,'is_superuser',False)

@method_decorator(csrf_exempt, name='dispatch')
class BackupImportView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [DebugPerm]
    def post(self, request):
        print('DEBUG POST user:', request.user, request.user.is_authenticated, getattr(request.user,'is_superuser',False))
        f = request.FILES.get('file')
        if not f:
            return JsonResponse({'error':'Archivo no subido.'}, status=400)
        path = os.path.join(settings.BASE_DIR, 'backup_import.json')
        with open(path, 'wb+') as dest:
            for c in f.chunks(): dest.write(c)
        completed = subprocess.run(['python3', 'manage.py', 'loaddata', path], capture_output=True)
        if completed.returncode==0:
            return JsonResponse({'ok':True, 'msg':'Restauración completada.'})
        else:
            return JsonResponse({'ok':False, 'error':completed.stderr.decode() or 'Fallo ejecutando loaddata.'}, status=500)

@csrf_exempt
def backup_import(request):
    if request.method != 'POST':
        return JsonResponse({'error':'Sólo POST'}, status=405)
    if not request.user.is_authenticated or not request.user.is_superuser:
        return JsonResponse({'error':'Solo superusuarios pueden restaurar.'}, status=403)
    f = request.FILES.get('file')
    if not f:
        return JsonResponse({'error':'Archivo no subido.'}, status=400)
    import os, subprocess
    from django.conf import settings
    path = os.path.join(settings.BASE_DIR, 'backup_import.json')
    with open(path, 'wb+') as dest:
        for chunk in f.chunks(): dest.write(chunk)
    completed = subprocess.run(['python3', 'manage.py', 'loaddata', path], capture_output=True)
    if completed.returncode==0:
        return JsonResponse({'ok':True, 'msg':'Restauración completada.'})
    else:
        return JsonResponse({'ok':False, 'error':completed.stderr.decode() or 'Fallo ejecutando loaddata.'}, status=500)