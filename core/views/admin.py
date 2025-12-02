from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from django.db.models import Count, Q, Avg, Sum, F
from django.utils.timezone import make_aware
from datetime import datetime, timedelta
from django.apps import apps
from django.http import FileResponse, JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
import os
import subprocess
from core.models import Carrera, RecursoApoyo, Usuario, Post, Comentario, MensajeDirecto, Chatbot, Notificacion, Grupo, UsuarioEvento, Evento, UsuarioGrupo
from core.serializers import CarreraSerializer, AlertaIASerializer, RecursoApoyoSerializer, UsuarioEventoSerializer
from core.permissions import IsSuperuserOrAdmin, IsAdminOrReadOnly, DebugPerm

@csrf_exempt
def test_dummy(request):
    return HttpResponse("ok", status=200)

class CarreraViewSet(viewsets.ModelViewSet):
    queryset = Carrera.objects.all().order_by('idCarrera')
    serializer_class = CarreraSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [permissions.IsAdminUser]
        else:
            self.permission_classes = [permissions.IsAuthenticated]
        return [Permission()for Permission in self.permission_classes]
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if Usuario.objects.filter(idCarrera=instance).exists():
            return Response({'error': 'No se puede eliminar la carrera porque existen usuarios asignados.'}, status=400)
        return super().destroy(request, *args, **kwargs)

class AlertaIAPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'

class AlertaIAAPIView(APIView):
    permission_classes = [IsSuperuserOrAdmin]
    def get(self, request):
        tipo = request.query_params.get('tipo')  # post, comentario, mensaje, chatbot
        label = request.query_params.get('label')
        score_min = float(request.query_params.get('score_min', -2))
        score_max = float(request.query_params.get('score_max', 2))
        usuario_id = request.query_params.get('idUser')
        mostrar_todo = request.query_params.get('mostrar_todo') == '1'
        resultados = []
        # Posts
        if not tipo or tipo == 'post':
            qs = Post.objects.all() if mostrar_todo else Post.objects.filter(AlertaIA=True)
            qs = qs.filter(SentimientoScore__isnull=False, SentimientoScore__gte=score_min, SentimientoScore__lte=score_max).order_by('-FechCreacPost')
            if label: qs = qs.filter(SentimientoLabel__icontains=label)
            if usuario_id: qs = qs.filter(idUser__idUser=usuario_id)
            for p in qs:
                resultados.append({
                    'tipo':'post','id':p.idPost,'usuario':str(p.idUser.UserName),'texto':p.TextPost or '',
                    'score': p.SentimientoScore, 'label': p.SentimientoLabel,
                    'fecha': p.FechCreacPost, 'extra': { 'alerta': p.AlertaIA }
                })
        # Comentarios
        if not tipo or tipo == 'comentario':
            cs = Comentario.objects.all() if mostrar_todo else Comentario.objects.filter(AlertaIACom=True)
            cs = cs.filter(SentimientoScoreCom__isnull=False, SentimientoScoreCom__gte=score_min, SentimientoScoreCom__lte=score_max).order_by('-FechCreacComen')
            if label: cs = cs.filter(SentimientoLabelCom__icontains=label)
            if usuario_id: cs = cs.filter(idUser__idUser=usuario_id)
            for c in cs:
                resultados.append({
                    'tipo':'comentario','id':c.idComentario,'usuario':str(c.idUser.UserName),'texto':c.TextComentario or '',
                    'score': c.SentimientoScoreCom, 'label':c.SentimientoLabelCom,
                    'fecha': c.FechCreacComen, 'extra': {'idPost': c.idPost_id, 'alerta': c.AlertaIACom}
                })
        # Mensajes directos
        if not tipo or tipo == 'mensaje':
            ms = MensajeDirecto.objects.all() if mostrar_todo else MensajeDirecto.objects.filter(AlertaIAMsgDirecto=True)
            ms = ms.filter(SentimientoScore__isnull=False, SentimientoScore__gte=score_min, SentimientoScore__lte=score_max).order_by('-FechMensaje')
            if label: ms = ms.filter(SentimientoLabel__icontains=label)
            if usuario_id: ms = ms.filter(sendUser__idUser=usuario_id)
            for m in ms:
                resultados.append({
                    'tipo':'mensaje','id':m.idMensajeDirecto,'usuario':str(m.sendUser.UserName),'texto':m.Mensaje or '',
                    'score': m.SentimientoScore, 'label':m.SentimientoLabel,
                    'fecha': m.FechMensaje, 'extra': {'para': m.receiveUser.UserName, 'alerta': m.AlertaIAMsgDirecto}
                })
        # Chatbot
        if not tipo or tipo == 'chatbot':
            bs = Chatbot.objects.all() if mostrar_todo else Chatbot.objects.filter(AlertaIAChat=True)
            bs = bs.filter(SentimientoScore__isnull=False, SentimientoScore__gte=score_min, SentimientoScore__lte=score_max).order_by('-FechInterac')
            if label: bs = bs.filter(SentimientoLabel__icontains=label)
            if usuario_id: bs = bs.filter(idUser__idUser=usuario_id)
            for b in bs:
                resultados.append({
                    'tipo':'chatbot','id':b.idChatbot,'usuario':str(b.idUser.UserName if b.idUser else ''),'texto':b.UserQuery or '',
                    'score': b.SentimientoScore, 'label':b.SentimientoLabel,
                    'fecha': b.FechInterac, 'extra': {'respuesta': b.Response, 'alerta': b.AlertaIAChat}
                })
        resultados = sorted(resultados, key=lambda x: x['fecha'], reverse=True)
        paginator = AlertaIAPagination()
        page = paginator.paginate_queryset(resultados, request)
        serializer = AlertaIASerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

class ReporteActividadUsuariosView(APIView):
    """
    GET /api/reportes/actividad_usuarios/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    """
    def get(self, request, *args, **kwargs):
        # Filtros de fecha
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        try:
            if date_from:
                date_from = make_aware(datetime.strptime(date_from, '%Y-%m-%d'))
            if date_to:
                date_to = make_aware(datetime.strptime(date_to, '%Y-%m-%d')) + timedelta(days=1)
        except Exception:
            return Response({'error': 'Formato de fecha inválido, usa YYYY-MM-DD'}, status=400)

        filtro_post = {}
        filtro_com = {}
        if date_from:
            filtro_post['FechCreacPost__gte'] = date_from
            filtro_com['FechCreacComen__gte'] = date_from
        if date_to:
            filtro_post['FechCreacPost__lt'] = date_to
            filtro_com['FechCreacComen__lt'] = date_to

        # Actividad por día
        posts = Post.objects.filter(**filtro_post).values('FechCreacPost__date').annotate(posts=Count('idPost'))
        coms = Comentario.objects.filter(**filtro_com).values('FechCreacComen__date').annotate(comentarios=Count('idComentario'))
        actividad = {}
        for p in posts:
            d = p['FechCreacPost__date'].isoformat() if hasattr(p['FechCreacPost__date'], 'isoformat') else str(p['FechCreacPost__date'])
            actividad.setdefault(d, {'fecha': d, 'posts': 0, 'comentarios': 0, 'total': 0})
            actividad[d]['posts'] = p['posts']
        for c in coms:
            d = c['FechCreacComen__date'].isoformat() if hasattr(c['FechCreacComen__date'], 'isoformat') else str(c['FechCreacComen__date'])
            actividad.setdefault(d, {'fecha': d, 'posts': 0, 'comentarios': 0, 'total': 0})
            actividad[d]['comentarios'] = c['comentarios']
        for d in actividad:
            actividad[d]['total'] = actividad[d]['posts'] + actividad[d]['comentarios']
        actividad_diaria = sorted(actividad.values(), key=lambda x:x['fecha'])

        # Actividad por tipo de usuario:
        posts_tipo = Post.objects.filter(**filtro_post).values('idUser__TipoUser').annotate(posts=Count('idPost'))
        coms_tipo = Comentario.objects.filter(**filtro_com).values('idUser__TipoUser').annotate(comentarios=Count('idComentario'))
        actividad_tipo = {}
        for r in posts_tipo:
            actividad_tipo.setdefault(r['idUser__TipoUser'], 0)
            actividad_tipo[r['idUser__TipoUser']] += r['posts']
        for r in coms_tipo:
            actividad_tipo.setdefault(r['idUser__TipoUser'], 0)
            actividad_tipo[r['idUser__TipoUser']] += r['comentarios']
        return Response({
            'actividad_diaria': actividad_diaria,
            'actividad_tipo_usuario': actividad_tipo,
        })

class ReporteSentimientoPublicacionesView(APIView):
    """
    GET /api/reportes/sentimiento_publicaciones/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD[&label=X][&grupo=ID][&carrera=ID]
    """
    def get(self, request, *args, **kwargs):
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        label = request.GET.get('label')
        grupo = request.GET.get('grupo')
        carrera = request.GET.get('carrera')
        filtro = {}
        if date_from:
            filtro['FechCreacPost__gte'] = date_from
        if date_to:
            filtro['FechCreacPost__lt'] = date_to
        if label:
            filtro['SentimientoLabel__icontains'] = label
        if grupo:
            filtro['idGrupo_id'] = grupo
        if carrera:
            filtro['idUser__idCarrera_id'] = carrera
        qs = Post.objects.filter(**filtro)
        # Distribución de sentimientos
        dist = qs.values('SentimientoLabel').annotate(total=Count('idPost')).order_by('-total')
        sentimiento_distribucion = { d['SentimientoLabel'] or 'sin_label': d['total'] for d in dist }
        # Evolución diaria
        evolucion = qs.values('FechCreacPost__date').annotate(score_promedio=Avg('SentimientoScore'), total=Count('idPost')).order_by('FechCreacPost__date')
        evolucion = [ {'fecha': str(e['FechCreacPost__date']), 'score_promedio': e['score_promedio'], 'total': e['total']} for e in evolucion ]
        return Response({ 'sentimiento_distribucion': sentimiento_distribucion, 'evolucion': evolucion })

class ReporteInteraccionesChatbotView(APIView):
    """
    GET /api/reportes/interacciones_chatbot/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    """
    def get(self, request, *args, **kwargs):
        filtro = {}
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        if date_from:
            filtro['FechInterac__gte'] = date_from
        if date_to:
            filtro['FechInterac__lt'] = date_to
        qs = Chatbot.objects.filter(**filtro)
        total_interacciones = qs.count()
        usuarios_unicos = qs.values('idUser').distinct().count()
        sentimiento_promedio = qs.aggregate(avg=Avg('SentimientoScore'))['avg']
        # topic principal o palabras clave simples
        if 'Topic' in Chatbot._meta.fields_map:  # Si existe campo Topic
            top_topics = list(qs.values('Topic').annotate(total=Count('idChatbot')).order_by('-total')[:7])
            top_topics = [{'topic': t['Topic'] or 'Sin tópico', 'total': t['total']} for t in top_topics]
        else:
            from collections import Counter
            import re
            words = []
            for c in qs: words += re.findall(r'\w+', (c.UserQuery or '').lower())
            counter = Counter(words)
            top_topics = [{'topic': w, 'total': n} for w, n in counter.most_common(7) if w not in ['de','la','que','el','en','y','a','los','por','con','para','una','su']]
        interacciones_diarias = list(
            qs.values('FechInterac__date').annotate(total=Count('idChatbot')).order_by('FechInterac__date')
        )
        interacciones_diarias = [ {'fecha': str(e['FechInterac__date']), 'total': e['total']} for e in interacciones_diarias ]
        return Response({
            'total_interacciones': total_interacciones,
            'usuarios_unicos': usuarios_unicos,
            'sentimiento_promedio': sentimiento_promedio,
            'top_topics': top_topics,
            'interacciones_diarias': interacciones_diarias,
        })

class RecursoApoyoViewSet(viewsets.ModelViewSet):
    queryset = RecursoApoyo.objects.all().order_by('-fecha_publicacion')
    serializer_class = RecursoApoyoSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    @action(detail=True, methods=['post'])
    def contar_vista(self, request, pk=None):
        recurso = self.get_object()
        recurso.contador_vistas += 1
        recurso.save(update_fields=['contador_vistas'])
        return Response({'ok':True,'contador_vistas':recurso.contador_vistas})

    @action(detail=True, methods=['post'])
    def contar_descarga(self, request, pk=None):
        recurso = self.get_object()
        recurso.contador_descargas += 1
        recurso.save(update_fields=['contador_descargas'])
        return Response({'ok':True,'contador_descargas':recurso.contador_descargas})

class ReporteRecursosApoyoView(APIView):
    """
    GET /api/reportes/recursos_apoyo/?tipo=...&categoria=...&date_from=...&date_to=...
    """
    def get(self, request, *args, **kwargs):
        filtro = {}
        tipo = request.GET.get('tipo')
        categoria = request.GET.get('categoria')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        if tipo: filtro['tipo'] = tipo
        if categoria: filtro['categoria'] = categoria
        if date_from: filtro['fecha_publicacion__gte'] = date_from
        if date_to: filtro['fecha_publicacion__lt'] = date_to
        qs = RecursoApoyo.objects.filter(**filtro)
        # Top recursos (por vistas y descargas)
        top_recursos = qs.order_by('-contador_vistas','-contador_descargas')[:15]
        top_recursos_dto = RecursoApoyoSerializer(top_recursos, many=True).data
        # Vistas por día
        vistas_dia = list(qs.values('fecha_publicacion__date').annotate(total=Sum('contador_vistas')).order_by('fecha_publicacion__date'))
        vistas_por_dia = [ {'fecha':str(v['fecha_publicacion__date']),'total':v['total']} for v in vistas_dia ]
        # Descargas por día
        descargas_dia = list(qs.values('fecha_publicacion__date').annotate(total=Sum('contador_descargas')).order_by('fecha_publicacion__date'))
        descargas_por_dia = [ {'fecha':str(v['fecha_publicacion__date']),'total':v['total']} for v in descargas_dia ]
        # Distribución por tipo
        dist_tipo = qs.values('tipo').annotate(total=Count('idRecurso')).order_by('-total')
        distribucion_tipo = {d['tipo']:d['total'] for d in dist_tipo}
        # Distribución por categoría
        dist_cat = qs.values('categoria').annotate(total=Count('idRecurso')).order_by('-total')
        distribucion_categoria = {d['categoria'] or 'Sin categoria':d['total'] for d in dist_cat}
        return Response({
            'top_recursos': top_recursos_dto,
            'vistas_por_dia': vistas_por_dia,
            'descargas_por_dia': descargas_por_dia,
            'distribucion_tipo': distribucion_tipo,
            'distribucion_categoria': distribucion_categoria,
        })

class ReporteGruposActivosView(APIView):
    """
    GET /api/reportes/grupos_activos/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD[&tipo=Publico/Privado]
    """
    def get(self, request, *args, **kwargs):
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        tipo = request.GET.get('tipo')
        filtro_grupo = {}
        if tipo:
            filtro_grupo['PrivGrupo'] = tipo
        grupos = Grupo.objects.filter(**filtro_grupo)
        # TOP grupos por actividad (posts+comentarios)
        top_info = []
        for grupo in grupos:
            filtro_post = {'idGrupo':grupo}
            filtro_com = {'idPost__idGrupo':grupo}
            if date_from: filtro_post['FechCreacPost__gte'] = date_from
            if date_to: filtro_post['FechCreacPost__lt'] = date_to
            if date_from: filtro_com['FechCreacComen__gte'] = date_from
            if date_to: filtro_com['FechCreacComen__lt'] = date_to
            total_posts = Post.objects.filter(**filtro_post).count()
            total_comentarios = Comentario.objects.filter(**filtro_com).count()
            miembros = UsuarioGrupo.objects.filter(idGrupo=grupo, estado='aceptado').count()
            top_info.append({'idGrupo':grupo.idGrupo, 'NomGrupo':grupo.NomGrupo, 'total_posts':total_posts, 'total_comentarios':total_comentarios, 'miembros':miembros, 'PrivGrupo':grupo.PrivGrupo})
        top_grupos = sorted(top_info, key=lambda x: (x['total_posts']+x['total_comentarios']), reverse=True)[:12]

        # Actividad diaria (para los grupos más activos)
        actividad_diaria = []
        for g in top_grupos:
            gpo = grupos.get(idGrupo=g['idGrupo'])
            qs_p = Post.objects.filter(idGrupo=gpo)
            qs_c = Comentario.objects.filter(idPost__idGrupo=gpo)
            if date_from: qs_p = qs_p.filter(FechCreacPost__gte=date_from)
            if date_to: qs_p = qs_p.filter(FechCreacPost__lt=date_to)
            if date_from: qs_c = qs_c.filter(FechCreacComen__gte=date_from)
            if date_to: qs_c = qs_c.filter(FechCreacComen__lt=date_to)
            por_dia = {}
            for p in qs_p.values('FechCreacPost__date').annotate(cnt=Count('idPost')):
                fecha = str(p['FechCreacPost__date'])
                por_dia.setdefault(fecha, {'fecha':fecha,'grupo':g['NomGrupo'],'total_posts':0,'total_comentarios':0})
                por_dia[fecha]['total_posts'] += p['cnt']
            for c in qs_c.values('FechCreacComen__date').annotate(cnt=Count('idComentario')):
                fecha = str(c['FechCreacComen__date'])
                por_dia.setdefault(fecha, {'fecha':fecha,'grupo':g['NomGrupo'],'total_posts':0,'total_comentarios':0})
                por_dia[fecha]['total_comentarios'] += c['cnt']
            actividad_diaria.extend(list(por_dia.values()))
        # Distribución tipo
        dist_tipo = grupos.values('PrivGrupo').annotate(total=Count('idGrupo'))
        distribucion_tipo = {d['PrivGrupo']:d['total'] for d in dist_tipo}
        return Response({
            'top_grupos': top_grupos,
            'actividad_diaria': actividad_diaria,
            'distribucion_tipo': distribucion_tipo
        })

class ReporteEventosMayorAsistenciaView(APIView):
    '''
    GET /api/reportes/eventos_mayor_asistencia/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD[&tipo=fisica/virtual][&estado=vigente][&min_asist=N]
    '''
    def get(self, request, *args, **kwargs):
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        modalidad = request.GET.get('tipo')
        estado = request.GET.get('estado')
        min_asist = request.GET.get('min_asist')
        filtro_evt = {}
        if date_from: filtro_evt['FechEvent__gte'] = date_from
        if date_to: filtro_evt['FechEvent__lt'] = date_to
        if modalidad: filtro_evt['Modalidad'] = modalidad
        if estado: filtro_evt['Estado'] = estado
        eventos = Evento.objects.filter(**filtro_evt)
        # Conteo asistentes
        evento_ids = [e.idEvento for e in eventos]
        asist_counts = UsuarioEvento.objects.filter(idEvento__in=evento_ids).values('idEvento').annotate(asist=Count('idUsuarioEvento')).order_by('-asist')
        count_by_id = {a['idEvento']:a['asist'] for a in asist_counts}
        top_eventos = []
        for e in eventos:
            n = count_by_id.get(e.idEvento,0)
            if min_asist and n < int(min_asist): continue
            top_eventos.append({'idEvento':e.idEvento,'TituloEvent':e.TituloEvent,'Modalidad':e.Modalidad,'Estado':e.Estado,'asistentes':n,'Fecha':e.FechEvent})
        # Top eventos barras
        barras_eventos = sorted(top_eventos, key=lambda t:-t['asistentes'])[:10]
        # Tendencia por fecha
        tendencia = UsuarioEvento.objects.filter(idEvento__in=evento_ids)
        if date_from: tendencia = tendencia.filter(FechRegistro__gte=date_from)
        if date_to: tendencia = tendencia.filter(FechRegistro__lt=date_to)
        tendencia = list(tendencia.values('FechRegistro__date').annotate(total_asistentes_dia=Count('idUsuarioEvento')).order_by('FechRegistro__date'))
        tendencia = [{'fecha':str(t['FechRegistro__date']),'total_asistentes_dia':t['total_asistentes_dia']} for t in tendencia]
        # Distribución por tipo
        dist_tipo = Evento.objects.filter(idEvento__in=evento_ids).values('Modalidad').annotate(total=Count('idEvento'))
        distribucion_tipo = {d['Modalidad']:d['total'] for d in dist_tipo}
        # Distribución por estado
        dist_estado = Evento.objects.filter(idEvento__in=evento_ids).values('Estado').annotate(total=Count('idEvento'))
        distribucion_estado = {d['Estado']:d['total'] for d in dist_estado}
        return Response({
            'top_eventos': top_eventos,
            'barras_eventos': [{'titulo':e['TituloEvent'],'asistentes':e['asistentes']} for e in barras_eventos],
            'tendencia': tendencia,
            'distribucion_tipo': distribucion_tipo,
            'distribucion_estado': distribucion_estado
        })

class ReporteTendenciasCarreraView(APIView):
    '''
    GET /api/reportes/tendencias_carrera/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD[&idCarrera=ID][&tipoMetrica=actividad/sentimiento]
    '''
    def get(self, request, *args, **kwargs):
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        idCarrera = request.GET.get('idCarrera')
        tipoMetrica = request.GET.get('tipoMetrica','actividad')
        carreras = Carrera.objects.all()
        if idCarrera:
            carreras = carreras.filter(idCarrera=idCarrera)
        resumen = []
        evolucion = []
        for c in carreras:
            ids_users = Usuario.objects.filter(idCarrera=c).values_list('idUser',flat=True)
            filtro_post = {'idUser__in':ids_users}
            filtro_com = {'idUser__in':ids_users}
            if date_from: filtro_post['FechCreacPost__gte'] = date_from
            if date_to: filtro_post['FechCreacPost__lt'] = date_to
            if date_from: filtro_com['FechCreacComen__gte'] = date_from
            if date_to: filtro_com['FechCreacComen__lt'] = date_to
            total_posts = Post.objects.filter(**filtro_post).count()
            total_com = Comentario.objects.filter(**filtro_com).count()
            users_count = Usuario.objects.filter(idCarrera=c).count()
            sent_post_avg = Post.objects.filter(**filtro_post).aggregate(avg=Avg('SentimientoScore'))['avg']
            resumen.append({'idCarrera':c.idCarrera,'NomCarrera':c.NomCarrera,'total_posts':total_posts,'total_comentarios':total_com,'sentimiento_avg':sent_post_avg or 0,'usuarios':users_count})
            # Evolución diaria/área
            qs_p = Post.objects.filter(**filtro_post).values('FechCreacPost__date').annotate(posts=Count('idPost'),sent_avg=Avg('SentimientoScore')).order_by('FechCreacPost__date')
            for e in qs_p:
                evolucion.append({'fecha':str(e['FechCreacPost__date']),'idCarrera':c.idCarrera,'NomCarrera':c.NomCarrera,'posts':e['posts'],'sent_avg':e['sent_avg'],'comentarios':0})
            qs_c = Comentario.objects.filter(**filtro_com).values('FechCreacComen__date').annotate(comments=Count('idComentario')).order_by('FechCreacComen__date')
            for e in qs_c:
                evolucion.append({'fecha':str(e['FechCreacComen__date']),'idCarrera':c.idCarrera,'NomCarrera':c.NomCarrera,'posts':0,'sent_avg':None,'comentarios':e['comments']})
        return Response({'resumen': resumen, 'evolucion': evolucion})

class ReporteNotificacionesView(APIView):
    """
    GET /api/reportes/notificaciones/?tipo=ALERTA&type_entrega=web&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&idUser=N
    """
    def get(self, request, *args, **kwargs):
        filtro = {}
        tipo = request.GET.get('tipo')
        entrega = request.GET.get('type_entrega')
        usuario = request.GET.get('idUser')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        if tipo: filtro['TipoNot'] = tipo
        if entrega: filtro['TipoEntrega'] = entrega
        if usuario: filtro['idUser__idUser'] = usuario
        if date_from: filtro['FechEnviado__gte'] = date_from
        if date_to: filtro['FechEnviado__lt'] = date_to
        qs = Notificacion.objects.filter(**filtro)
        total = qs.count()
        # Por tipo
        por_tipo = qs.values('TipoNot').annotate(total=Count('idNotificacion')).order_by('-total')
        total_por_tipo = {t['TipoNot']:t['total'] for t in por_tipo}
        # Curva por día
        por_dia = qs.values('FechEnviado__date').annotate(total=Count('idNotificacion')).order_by('FechEnviado__date')
        curva_por_dia = [{'fecha':str(d['FechEnviado__date']),'total':d['total']} for d in por_dia]
        # Por tipo de entrega
        por_entrega = qs.values('TipoEntrega').annotate(total=Count('idNotificacion'))
        distribucion_entrega = {e['TipoEntrega']:e['total'] for e in por_entrega}
        return Response({
            'total_enviadas': total,
            'total_por_tipo': total_por_tipo,
            'curva_por_dia': curva_por_dia,
            'distribucion_entrega': distribucion_entrega
        })

@method_decorator(csrf_exempt, name='dispatch')
class BackupExportView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        path = os.path.join(settings.BASE_DIR, 'backup_tmp.json')
        subprocess.call(['python3', 'manage.py', 'dumpdata', '--natural-foreign', '--natural-primary', '--all', '--indent', '2', '-o', path])
        return FileResponse(open(path, 'rb'), as_attachment=True, filename='respaldo_estadia.json')

@method_decorator(csrf_exempt, name='dispatch')
class BackupImportView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [DebugPerm]
    def post(self, request):
        print('DEBUG POST user:', request.user, request.user.is_authenticated, getattr(request.user,'is_superuser',False))
        f = request.FILES.get('file')
        if not f:
            return JsonResponse({'error':'Archivo no subido.'}, status=400)
        path = os.path.join(settings.BASE_DIR, 'backup_import.json')
        with open(path, 'wb+') as dest:
            for c in f.chunks(): dest.write(c)
        completed = subprocess.run(['python3', 'manage.py', 'loaddata', path], capture_output=True)
        if completed.returncode==0:
            return JsonResponse({'ok':True, 'msg':'Restauración completada.'})
        else:
            return JsonResponse({'ok':False, 'error':completed.stderr.decode() or 'Fallo ejecutando loaddata.'}, status=500)

@csrf_exempt
def backup_import(request):
    if request.method != 'POST':
        return JsonResponse({'error':'Sólo POST'}, status=405)
    if not request.user.is_authenticated or not request.user.is_superuser:
        return JsonResponse({'error':'Solo superusuarios pueden restaurar.'}, status=403)
    f = request.FILES.get('file')
    if not f:
        return JsonResponse({'error':'Archivo no subido.'}, status=400)
    import os, subprocess
    from django.conf import settings
    path = os.path.join(settings.BASE_DIR, 'backup_import.json')
    with open(path, 'wb+') as dest:
        for chunk in f.chunks(): dest.write(chunk)
    completed = subprocess.run(['python3', 'manage.py', 'loaddata', path], capture_output=True)
    if completed.returncode==0:
        return JsonResponse({'ok':True, 'msg':'Restauración completada.'})
    else:
        return JsonResponse({'ok':False, 'error':completed.stderr.decode() or 'Fallo ejecutando loaddata.'}, status=500)
