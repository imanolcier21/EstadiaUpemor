
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import PasswordResetRequestAPIView, PasswordResetConfirmAPIView, MiPerfilView, PerfilPublicoView, ExplorarUsuariosView

# Inicializa el Router
router = DefaultRouter()
# Registra el ViewSet. Esto genera: /usuarios/, /usuarios/{id}/
router.register(r'usuarios', views.UsuarioViewSet)
router.register(r'carreras', views.CarreraViewSet)
# Registra el ViewSet para publicaciones
router.register(r'posts', views.PostViewSet)
router.register(r'comentarios', views.ComentarioViewSet)
router.register(r'mensajes', views.MensajeDirectoViewSet)

urlpatterns = [
    # Rutas para el login/registro público (Estudiantes)
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout_user, name='logout'),
    path('check_session/', views.check_session, name='check_session'),
    path('profile/onboard/', views.UserProfileUpdate.as_view(), name='user_profile_update'),
    path('password_reset/', PasswordResetRequestAPIView.as_view(), name='password_reset'),
    path('password_reset_confirm/', PasswordResetConfirmAPIView.as_view(), name='password_reset_confirm'),
    path('perfil/mio/', MiPerfilView.as_view(), name='mi_perfil'),
    path('perfil/<str:username>/', PerfilPublicoView.as_view(), name='perfil_publico'),
    path('usuarios/explorar/', ExplorarUsuariosView.as_view(), name='explorar_usuarios'),
    
    # Incluye todas las rutas generadas por el Router (Gestión de Usuarios)
    path('', include(router.urls)),

]