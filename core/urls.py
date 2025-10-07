
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Inicializa el Router
router = DefaultRouter()
# Registra el ViewSet. Esto genera: /usuarios/, /usuarios/{id}/
router.register(r'usuarios', views.UsuarioViewSet)

urlpatterns = [
    # Rutas para el login/registro público (Estudiantes)
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    
    # Incluye todas las rutas generadas por el Router (Gestión de Usuarios)
    path('', include(router.urls)),
]