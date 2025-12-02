from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from django.shortcuts import get_object_or_404
from core.models import Usuario, Carrera, Notificacion
from core.serializers import UsuarioSerializer, UsuarioExplorarSerializer
from core.permissions import IsAdminOrSuperUser

class UsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD para el modelo Usuario (Gestión de Usuarios).
    Solo accesible para roles administrativos.
    """
    queryset = Usuario.objects.all().order_by('idUser')
    serializer_class = UsuarioSerializer

    def get_permissions(self):
        # Solo permito a admins crear, actualizar o borrar, pero cualquiera autenticado puede listar y ver
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdminOrSuperUser]
        else:  # 'list', 'retrieve'
            self.permission_classes = [permissions.IsAuthenticated]
        return [perm() for perm in self.permission_classes]

    # Modificación del método create (POST) - CREAR USUARIO/ADMIN
    def create(self, request, *args, **kwargs):
        # 1. Usar el serializador para VALIDACIÓN
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. Extraer datos del serializador validado
        data = serializer.validated_data 
        
        # Necesitamos la contraseña y el TipoUser para la creación
        password = request.data.get('password')
        tipo_user = data.get('TipoUser', 'Estudiante') # Toma el rol enviado por el formulario

        # 3. Crear el usuario usando el manager custom para hashear la contraseña
        try:
            user = Usuario.objects.create_user(
                CorreoUser=data['CorreoUser'],
                UserName=data['UserName'],
                NomUser=data['NomUser'],
                ApePatUser=data['ApePatUser'],
                ApeMatUser=data.get('ApeMatUser', ''),
                password=password,
                TipoUser=tipo_user
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Serializar el objeto creado para la respuesta
        response_serializer = UsuarioSerializer(user)

        # 5. Retornar respuesta exitosa
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


    # Modificación del método update (PUT/PATCH) - EDITAR USUARIO
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        password = request.data.pop('password', None) # Quita la contraseña para manejar el hash

        # El serializador maneja la validación de los datos actualizados
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Actualiza el resto de los campos
        self.perform_update(serializer)
        
        # Si se proporcionó una nueva contraseña, la hashea y guarda
        if password:
            instance.set_password(password)
            instance.save() 
            
        return Response(serializer.data)

class UserProfileUpdate(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        user = request.user

        carrera_id = request.data.get('carrera_id')
        

        try:
            if carrera_id:
                user.idCarrera_id = carrera_id
            
            user.is_profile_complete = True
            user.save()

            return Response({'message': 'Perfil actualizado exitosamente'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MiPerfilView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        serializer = UsuarioSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        serializer = UsuarioSerializer(user, data=request.data, partial=False, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def patch(self, request):
        user = request.user
        serializer = UsuarioSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class PerfilPublicoView(APIView):
    def get(self, request, username):
        usuario = get_object_or_404(Usuario, UserName=username, is_profile_public=True)
        serializer = UsuarioSerializer(usuario, context={'request': request})
        data = serializer.data
        if not usuario.show_posts_public:
            data['show_posts_public'] = False
        if not usuario.mostrar_contacto:
            data['info_contacto'] = None
        return Response(data)

class UsuarioExplorarPagination(PageNumberPagination):
    page_size = 12

class ExplorarUsuariosView(APIView):
    def get(self, request):
        query = request.GET.get('search','').strip()
        qs = Usuario.objects.filter(is_profile_public=True)
        if query:
            qs = qs.filter(Q(UserName__icontains=query) | Q(NomUser__icontains=query) | Q(ApePatUser__icontains=query) | Q(descripcion__icontains=query))
        qs = qs.order_by('-FechUnido')
        paginator = UsuarioExplorarPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = UsuarioExplorarSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

# ---- Endpoint para consultar notificaciones ----
class MisNotificacionesView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        notis = Notificacion.objects.filter(idUser=request.user).order_by('-FechEnviado')[:10]
        data = [
            dict(
                id=n.idNotificacion,
                tipo=n.TipoNot,
                mensaje=n.MensajeNot,
                fecha=n.FechEnviado,
                entrega=n.TipoEntrega
            ) for n in notis
        ]
        return Response(data)
