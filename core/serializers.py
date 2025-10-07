from rest_framework import serializers
from .models import Usuario, Carrera

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