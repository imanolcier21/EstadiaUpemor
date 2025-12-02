from rest_framework import serializers
from .models import Usuario
from .models import Carrera
from .models import Post
from .models import Comentario
from .models import MensajeDirecto
from .models import Grupo, UsuarioGrupo
from .models import Evento, UsuarioEvento
from .models import RecursoApoyo

class UsuarioSerializer(serializers.ModelSerializer):
    # Campo para mostrar el nombre de la carrera (solo lectura)
    carrera_nombre = serializers.CharField(source='idCarrera.NomCarrera', read_only=True)
    foto_perfil_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Usuario
        # Incluimos los campos esenciales para mostrar y gestionar
        fields = [
            'idUser', 'NomUser', 'ApePatUser', 'ApeMatUser', 'UserName', 'CorreoUser', 'genero',
            'TipoUser', 'is_active', 'FechUnido', 'idCarrera', 'carrera_nombre', 'descripcion', 'foto_perfil', 'foto_perfil_url', 'is_profile_public',
            'show_posts_public', 'mostrar_contacto', 'info_contacto'
        ]
        # La contraseña NUNCA debe ser expuesta en el serializador de lectura/listado
        read_only_fields = ('FechUnido', 'foto_perfil_url', 'carrera_nombre')

    def get_foto_perfil_url(self, obj):
        request = self.context.get('request')
        if obj.foto_perfil:
            url = obj.foto_perfil.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None

# ---- UsuarioExplorarSerializer para búsquedas rápidas ----
class UsuarioExplorarSerializer(serializers.ModelSerializer):
    foto_perfil_url = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Usuario
        fields = ['idUser', 'UserName', 'NomUser', 'ApePatUser', 'foto_perfil_url', 'descripcion']

    def get_foto_perfil_url(self, obj):
        request = self.context.get('request')
        if obj.foto_perfil:
            url = obj.foto_perfil.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None

class CarreraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrera
        fields = ['idCarrera', 'NomCarrera', 'DescCarrera']
        read_only_fields = ('idCarrera',)

class PostSerializer(serializers.ModelSerializer):
    autor = serializers.CharField(source='idUser.UserName', read_only=True)
    media_url = serializers.SerializerMethodField(read_only=True)
    idUser = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Post
        fields = [
            'idPost', 'TextPost', 'MediaPost', 'media_url', 'FechCreacPost', 'FechUpdatePost',
            'idUser', 'autor', 'idGrupo', 'SentimientoScore', 'SentimientoLabel'
        ]
        read_only_fields = (
            'idPost', 'FechCreacPost', 'FechUpdatePost', 'autor', 'media_url',
            'SentimientoScore', 'SentimientoLabel', 'idUser'
        )

    def get_media_url(self, obj):
        request = self.context.get('request')
        if obj.MediaPost:
            url = obj.MediaPost.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None

    def validate_MediaPost(self, value):
        if value:
            content_type = value.content_type
            if not (content_type.startswith('image/') or content_type.startswith('video/')):
                raise serializers.ValidationError('Solo se permiten imágenes o videos.')
        return value

class ComentarioSerializer(serializers.ModelSerializer):
    autor = serializers.CharField(source='idUser.UserName', read_only=True)
    idUser = serializers.PrimaryKeyRelatedField(read_only=True)
    idPost = serializers.PrimaryKeyRelatedField(queryset=Post.objects.all(), write_only=True)

    class Meta:
        model = Comentario
        fields = ['idComentario', 'TextComentario', 'autor', 'idUser', 'idPost', 'FechCreacComen', 'FechUpdateComen']
        read_only_fields = ['idComentario', 'FechCreacComen', 'FechUpdateComen', 'autor', 'idUser']

class MensajeDirectoSerializer(serializers.ModelSerializer):
    remitente = serializers.CharField(source='sendUser.UserName', read_only=True)
    destinatario = serializers.CharField(source='receiveUser.UserName', read_only=True)
    sendUser = serializers.PrimaryKeyRelatedField(read_only=True)
    receiveUser = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = MensajeDirecto
        fields = [
            'idMensajeDirecto', 'remitente', 'destinatario', 'sendUser', 'receiveUser',
            'Mensaje', 'MediaMensaje', 'FechMensaje', 'Leido', 'FechUpdateMensaje'
        ]
        read_only_fields = ['idMensajeDirecto', 'remitente', 'destinatario', 'sendUser', 'FechMensaje', 'FechUpdateMensaje']

class GrupoSerializer(serializers.ModelSerializer):
    creador_nombre = serializers.CharField(source='idUser.UserName', read_only=True)
    imagen_url = serializers.SerializerMethodField(read_only=True)
    miembros_count = serializers.SerializerMethodField(read_only=True)
    estado = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Grupo
        fields = [
            'idGrupo', 'NomGrupo', 'DescGrupo', 'PrivGrupo', 'FechCreaGrupo',
            'idUser', 'creador_nombre', 'ReglasGrupo', 'ImagenGrupo', 'imagen_url', 'miembros_count', 'estado'
        ]
        read_only_fields = ('idGrupo', 'FechCreaGrupo', 'creador_nombre', 'imagen_url', 'miembros_count', 'idUser', 'estado')

    def get_imagen_url(self, obj):
        request = self.context.get('request')
        if obj.ImagenGrupo:
            url = obj.ImagenGrupo.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None
    def get_miembros_count(self, obj):
        return UsuarioGrupo.objects.filter(idGrupo=obj).count()

    def get_estado(self, obj):
        request = self.context.get('request', None)
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            from .models import UsuarioGrupo
            rel = UsuarioGrupo.objects.filter(idGrupo=obj, idUser=request.user).first()
            if rel:
                return rel.estado  # "aceptado" o "pendiente"
        return None

class UsuarioGrupoSerializer(serializers.ModelSerializer):
    user_nombre = serializers.CharField(source='idUser.UserName', read_only=True)
    grupo_nombre = serializers.CharField(source='idGrupo.NomGrupo', read_only=True)
    class Meta:
        model = UsuarioGrupo
        fields = ['idUsuarioGrupo', 'IngresoGrupo', 'Rol', 'estado', 'idGrupo', 'grupo_nombre', 'idUser', 'user_nombre']
        read_only_fields = ('idUsuarioGrupo', 'IngresoGrupo', 'grupo_nombre', 'user_nombre')

class EventoSerializer(serializers.ModelSerializer):
    creador_nombre = serializers.CharField(source='creador.UserName', read_only=True)
    asistentes_count = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Evento
        fields = [
            'idEvento', 'TituloEvent', 'DescEvent', 'FechEvent', 'Duracion', 'LugarEvent','Modalidad', 'Estado', 'creador', 'creador_nombre', 'asistentes_count', 'FechCreado'
        ]
        read_only_fields = ('idEvento', 'creador','creador_nombre','asistentes_count','FechCreado')

    def get_asistentes_count(self, obj):
        return UsuarioEvento.objects.filter(idEvento=obj).count()  # total inscripciones para evento

class UsuarioEventoSerializer(serializers.ModelSerializer):
    user_nombre = serializers.CharField(source='idUser.UserName', read_only=True)
    evento_titulo = serializers.CharField(source='idEvento.TituloEvent', read_only=True)
    class Meta:
        model = UsuarioEvento
        fields = ['idUsuarioEvento', 'idUser', 'user_nombre', 'idEvento', 'evento_titulo', 'tipo', 'FechRegistro']
        read_only_fields = ('idUsuarioEvento','user_nombre','evento_titulo','FechRegistro')

class AlertaIASerializer(serializers.Serializer):
    tipo = serializers.CharField()
    id = serializers.IntegerField()
    usuario = serializers.CharField()
    texto = serializers.CharField()
    score = serializers.FloatField()
    label = serializers.CharField()
    fecha = serializers.DateTimeField()
    extra = serializers.JSONField(required=False)

class RecursoApoyoSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.CharField(source='autor.UserName', read_only=True)
    class Meta:
        model = RecursoApoyo
        fields = [
            'idRecurso', 'tipo', 'titulo', 'descripcion',
            'archivo', 'url', 'categoria', 'etiqueta', 'fecha_publicacion', 'autor', 'autor_nombre',
            'contador_vistas', 'contador_descargas'
        ]
        read_only_fields = ('idRecurso', 'fecha_publicacion', 'contador_vistas', 'contador_descargas', 'autor_nombre')