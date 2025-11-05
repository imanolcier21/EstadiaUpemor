from rest_framework import serializers
from .models import Usuario
from .models import Carrera
from .models import Post
from .models import Comentario
from .models import MensajeDirecto

class UsuarioSerializer(serializers.ModelSerializer):
    # Campo personalizado para la relación de Carrera (mostrar el nombre, no el ID)
    idCarrera = serializers.CharField(source='idCarrera.NomCarrera', required=False, allow_null=True)
    foto_perfil_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Usuario
        # Incluimos los campos esenciales para mostrar y gestionar
        fields = [
            'idUser', 'NomUser', 'ApePatUser', 'ApeMatUser', 'UserName', 'CorreoUser', 'genero',
            'TipoUser', 'is_active', 'FechUnido', 'idCarrera', 'descripcion', 'foto_perfil_url', 'is_profile_public',
            'show_posts_public', 'mostrar_contacto', 'info_contacto'
        ]
        # La contraseña NUNCA debe ser expuesta en el serializador de lectura/listado
        read_only_fields = ('FechUnido', 'foto_perfil_url')

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
        fields = ['idCarrera', 'NomCarrera']
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