from rest_framework import serializers
from .models import Usuario
from .models import Carrera
from .models import Post

class UsuarioSerializer(serializers.ModelSerializer):
    # Campo personalizado para la relación de Carrera (mostrar el nombre, no el ID)
    idCarrera = serializers.CharField(source='idCarrera.NomCarrera', required=False, allow_null=True)

    class Meta:
        model = Usuario
        # Incluimos los campos esenciales para mostrar y gestionar
        fields = [
            'idUser', 'NomUser', 'ApePatUser', 'ApeMatUser', 'UserName', 
            'CorreoUser', 'TipoUser', 'is_active', 'FechUnido', 'idCarrera'
        ]
        # La contraseña NUNCA debe ser expuesta en el serializador de lectura/listado
        read_only_fields = ('FechUnido',)

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