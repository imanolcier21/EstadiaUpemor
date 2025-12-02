from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from core.models import Grupo, UsuarioGrupo
from core.serializers import GrupoSerializer, UsuarioGrupoSerializer
from core.permissions import IsGroupAdminOrSuperuser
from core.autenticacion import CsrfExemptSessionAuthentication

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
