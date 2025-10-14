
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Inicializa el Router
router = DefaultRouter()
# Registra el ViewSet. Esto genera: /usuarios/, /usuarios/{id}/
router.register(r'usuarios', views.UsuarioViewSet)
router.register(r'carreras', views.CarreraViewSet)

urlpatterns = [
    # Rutas para el login/registro público (Estudiantes)
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),

    path('profile/onboard/', views.UserProfileUpdate.as_view(), name='user_profile_update'),
    
    # Incluye todas las rutas generadas por el Router (Gestión de Usuarios)
    path('', include(router.urls)),

]