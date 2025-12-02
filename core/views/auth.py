from django.contrib.auth import authenticate, login, logout as django_logout, get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.views import APIView
from django.utils.decorators import method_decorator
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
from django.core.exceptions import ValidationError
import json
from core.models import Usuario

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
        'idUser': user.idUser,
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
            
            # Enviar correo de bienvenida
            try:
                send_mail(
                    'Bienvenido a UpeApp',
                    f'Hola {username}, gracias por registrarte en UpeApp. Tu cuenta ha sido creada exitosamente.',
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=True,
                )
            except:
                pass # No fallar el registro si falla el correo
            
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
                    'idUser': user.idUser,
                    'UserName': user.UserName,
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
