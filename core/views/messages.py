from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.db import models
from django.conf import settings
from core.models import MensajeDirecto, Usuario, Notificacion
from core.serializers import MensajeDirectoSerializer
from core.permissions import IsInvolvedOrAdminMensaje
from core.services import analiza_texto_con_gemini

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
        receptor = Usuario.objects.get(idUser=rec_id)
        msg = serializer.save(sendUser=user, receiveUser=receptor)
        # Notificar al receptor
        Notificacion.objects.create(
            idUser=receptor,
            TipoNot='Mensaje',
            MensajeNot=f'Nuevo mensaje de {user.UserName}: "{msg.Mensaje[:64]}"',
            TipoEntrega='web',
        )
        # Enviar correo al receptor
        try:
            from django.core.mail import send_mail
            send_mail(
                'Nuevo Mensaje en UpeApp',
                f'Hola {receptor.UserName}, tienes un nuevo mensaje de {user.UserName}: "{msg.Mensaje[:50]}..."',
                settings.DEFAULT_FROM_EMAIL,
                [receptor.CorreoUser],
                fail_silently=True,
            )
        except:
            pass
        # Analizar el mensaje con Gemini
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
