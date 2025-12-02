from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import models
from django.conf import settings
from core.models import Post, Comentario, Usuario, Notificacion
from core.serializers import PostSerializer, ComentarioSerializer
from core.permissions import IsOwnerOrAdmin, IsOwnerOrAdminComentario
from core.services import analiza_texto_con_gemini

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
        
        # Enviar correo masivo (CUIDADO: Rendimiento)
        try:
            from django.core.mail import send_mail
            recipient_list = [u.CorreoUser for u in usuarios if u.CorreoUser]
            if recipient_list:
                send_mail(
                    'Nueva Publicación en UpeApp',
                    f'Hola, {self.request.user.UserName} ha publicado algo nuevo: "{post.TextPost[:50]}..."',
                    settings.DEFAULT_FROM_EMAIL,
                    recipient_list,
                    fail_silently=True,
                )
        except:
            pass

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
        
        # Notificar al dueño del post
        post = comentario.idPost
        if post.idUser.idUser != self.request.user.idUser:
            Notificacion.objects.create(
                idUser=post.idUser,
                TipoNot='Comentario',
                MensajeNot=f'{self.request.user.UserName} comentó tu publicación: "{comentario.TextComentario[:50]}..."',
                TipoEntrega='web'
            )
            # Enviar correo al dueño
            try:
                from django.core.mail import send_mail
                send_mail(
                    'Nuevo Comentario en tu Publicación',
                    f'Hola {post.idUser.UserName}, {self.request.user.UserName} comentó tu publicación: "{comentario.TextComentario}"',
                    settings.DEFAULT_FROM_EMAIL,
                    [post.idUser.CorreoUser],
                    fail_silently=True,
                )
            except:
                pass

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
