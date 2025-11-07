
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import PasswordResetRequestAPIView, PasswordResetConfirmAPIView, MiPerfilView, PerfilPublicoView, ExplorarUsuariosView, MisNotificacionesView, ChatbotAPIView, AlertaIAAPIView, backup_import

# Inicializa el Router
router = DefaultRouter()
# Registra el ViewSet. Esto genera: /usuarios/, /usuarios/{id}/
router.register(r'usuarios', views.UsuarioViewSet)
router.register(r'carreras', views.CarreraViewSet)
# Registra el ViewSet para publicaciones
router.register(r'posts', views.PostViewSet)
router.register(r'comentarios', views.ComentarioViewSet)
router.register(r'mensajes', views.MensajeDirectoViewSet)
router.register(r'grupos', views.GrupoViewSet)
router.register(r'eventos', views.EventoViewSet)
router.register(r'recursos_apoyo', views.RecursoApoyoViewSet)

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
    path('notificaciones/mis/', MisNotificacionesView.as_view(), name='mis_notificaciones'),
    path('chatbot/', ChatbotAPIView.as_view(), name='chatbot'),
    path('dummy/', views.test_dummy),
    
    # Incluye todas las rutas generadas por el Router (Gestión de Usuarios)
    path('', include(router.urls)),

]

urlpatterns += [
    path('alertas_ia/', AlertaIAAPIView.as_view()),
    path('reportes/actividad_usuarios/', views.ReporteActividadUsuariosView.as_view()),
    path('reportes/sentimiento_publicaciones/', views.ReporteSentimientoPublicacionesView.as_view()),
    path('reportes/interacciones_chatbot/', views.ReporteInteraccionesChatbotView.as_view()),
    path('reportes/recursos_apoyo/', views.ReporteRecursosApoyoView.as_view()),
    path('reportes/grupos_activos/', views.ReporteGruposActivosView.as_view()),
    path('reportes/eventos_mayor_asistencia/', views.ReporteEventosMayorAsistenciaView.as_view()),
    path('reportes/tendencias_carrera/', views.ReporteTendenciasCarreraView.as_view()),
    path('reportes/notificaciones/', views.ReporteNotificacionesView.as_view()),
    path('backup/export/', views.BackupExportView.as_view()),
    path('backup/import/', backup_import),
]