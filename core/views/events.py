from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from core.models import Evento, UsuarioEvento
from core.serializers import EventoSerializer, UsuarioEventoSerializer
from core.permissions import IsEventoCreadorOrAdmin
from core.autenticacion import CsrfExemptSessionAuthentication

@method_decorator(csrf_exempt, name='dispatch')
class EventoViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    queryset = Evento.objects.all().order_by('FechEvent')
    serializer_class = EventoSerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['TituloEvent', 'DescEvent', 'LugarEvent']
    ordering_fields = ['FechEvent']

    def get_permissions(self):
        if self.action in ['create']:
            return [IsAdminUser()]
        elif self.action in ['update','partial_update','destroy']:
            return [IsEventoCreadorOrAdmin()]
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        serializer.save(creador=self.request.user)

    @action(detail=True, methods=['post'], url_path='inscribir')
    def inscribir(self, request, pk=None):
        evento = self.get_object()
        user = request.user
        if UsuarioEvento.objects.filter(idEvento=evento, idUser=user).exists():
            return Response({'error':'Ya registrado en este evento.'}, status=400)
        UsuarioEvento.objects.create(idEvento=evento, idUser=user, tipo='asistencia')
        return Response({'status': 'Inscripción exitosa.'})

    @action(detail=True, methods=['post'], url_path='desinscribir')
    def desinscribir(self, request, pk=None):
        evento = self.get_object()
        user = request.user
        reg = UsuarioEvento.objects.filter(idEvento=evento, idUser=user).first()
        if reg:
            reg.delete()
            return Response({'status': 'Inscripción cancelada.'})
        return Response({'error':'No estabas inscrito.'}, status=400)

    @action(detail=True, methods=['get'], url_path='asistentes')
    def asistentes(self, request, pk=None):
        evento = self.get_object()
        asistentes = UsuarioEvento.objects.filter(idEvento=evento)
        data = UsuarioEventoSerializer(asistentes, many=True).data
        return Response(data)

    @action(detail=False, methods=['get'], url_path='mis')
    def mis_eventos(self, request):
        ue = UsuarioEvento.objects.filter(idUser=request.user).values_list('idEvento', flat=True)
        eventos = Evento.objects.filter(idEvento__in=ue)
        page = self.paginate_queryset(eventos)
        s = EventoSerializer(page, many=True, context={'request': request}) if page is not None else EventoSerializer(eventos, many=True, context={'request': request})
        return self.get_paginated_response(s.data) if page is not None else Response(s.data)
