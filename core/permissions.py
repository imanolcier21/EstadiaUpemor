from rest_framework import permissions
from core.models import UsuarioGrupo

class IsAdminOrSuperUser(permissions.BasePermission):
    """
    Permite el acceso solo si el usuario es 'Admin' o Superuser.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                    (request.user.TipoUser == 'Admin' or request.user.is_superuser))

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

class IsOwnerOrAdminComentario(permissions.BasePermission):
    """Permite editar/eliminar solo al autor o admin."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_authenticated:
            if obj.idUser == request.user:
                return True
            if request.user.TipoUser == 'Admin' or request.user.is_superuser:
                return True
        return False

class IsInvolvedOrAdminMensaje(permissions.BasePermission):
    """Solo el emisor, receptor o admin/superuser pueden ver/interactuar."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_authenticated:
            if obj.sendUser == request.user or obj.receiveUser == request.user:
                return True
            if request.user.TipoUser == 'Admin' or request.user.is_superuser:
                return True
        return False

class IsGroupAdminOrSuperuser(permissions.BasePermission):
    """Permite administración solo a admins de grupo o admin plataforma."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser or getattr(request.user, 'TipoUser', '') == 'Admin':
            return True
        # Si el usuario es admin del grupo
        return UsuarioGrupo.objects.filter(idGrupo=obj, idUser=request.user, Rol='Admin').exists()

class IsEventoCreadorOrAdmin(permissions.IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        return request.user.is_superuser or obj.creador == request.user

class IsSuperuserOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and (request.user.is_superuser or getattr(request.user, 'TipoUser', '') == 'Admin')

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and (request.user.is_superuser or getattr(request.user,'TipoUser',None)=='Admin')

class DebugPerm(permissions.BasePermission):
    def has_permission(self, request, view):
        print('DEBUG PERM:', request.user, request.user.is_authenticated, getattr(request.user,'is_superuser',False))
        return request.user.is_authenticated and getattr(request.user,'is_superuser',False)
