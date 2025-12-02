from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from core.autenticacion import CsrfExemptSessionAuthentication
from core.models import Chatbot
from core.services import consulta_openai, analiza_texto_con_openai

class ChatbotAPIView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = []
    def post(self, request):
        user = request.user if hasattr(request, 'user') and getattr(request.user, 'is_authenticated', False) else None
        mensaje = request.data.get('mensaje', '')
        history = request.data.get('history', [])
        api_key = getattr(settings, 'OPENAI_API_KEY', None)
        model = getattr(settings, 'OPENAI_CHAT_MODEL', 'gpt-3.5-turbo')
        if not api_key:
            return Response({'error': 'OpenAI API Key no configurada en settings.'}, status=500)
        if not mensaje.strip():
            return Response({'error': 'Mensaje vacío.'}, status=400)
        system_prompt = ("Eres un chatbot de apoyo emocional para estudiantes universitarios. "
                         "Ayuda, orienta y responde con empatía. Si detectas tristeza o crisis brinda orientación básica. No reemplazas atención psicológica profesional.")
        respuesta_ia = consulta_openai(system_prompt + "\nEstudiante: " + mensaje, history, api_key, model)
        # --- Análisis de la emoción del mensaje recibido y posible alerta IA ---
        score, label, suicidio = analiza_texto_con_openai(mensaje, api_key, model)
        alerta = bool(suicidio or (label in ["depresion", "suicidio"] and score < 0))
        # --- Guardar en base de datos la interacción si hay usuario autenticado ---
        if user is not None and user.is_authenticated:
            Chatbot.objects.create(
                idUser=user,
                UserQuery=mensaje,
                Response=respuesta_ia,
                Topic=None,
                SentimientoScore=score,
                SentimientoLabel=label,
                AlertaIAChat=alerta
            )
        return Response({'respuesta': respuesta_ia, 'score': score, 'label': label, 'alerta': alerta})
