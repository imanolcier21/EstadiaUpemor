from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

class Carrera(models.Model):
    idCarrera = models.AutoField(primary_key=True)
    NomCarrera = models.CharField(max_length=45)
    DescCarrera = models.CharField(max_length=255, null=True, blank=True)
    FechCreacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Carrera' # Mantiene el nombre de la tabla de SQL

    def __str__(self):
        return self.NomCarrera

class UsuarioManager(BaseUserManager):
    def create_user(self, CorreoUser, UserName, NomUser, ApePatUser, ApeMatUser, password=None, **extra_fields):
        if not CorreoUser:
            raise ValueError('El usuario debe tener un correo electrónico')
        email = self.normalize_email(CorreoUser)
        user = self.model(CorreoUser=email, UserName=UserName, NomUser=NomUser, ApePatUser=ApePatUser, ApeMatUser=ApeMatUser, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, CorreoUser, UserName, NomUser, ApePatUser, ApeMatUser, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('TipoUser', 'Admin')  # Establece el tipo de usuario por defecto

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(CorreoUser, UserName, NomUser, ApePatUser, ApeMatUser, password, **extra_fields)

class Usuario(AbstractBaseUser, PermissionsMixin):
    TIPO_USUARIO_CHOICES = (
        ('Estudiante', 'Estudiante'),
        ('Profesor', 'Profesor'),
        ('Admin', 'Admin'),
    )
    PRIVACIDAD_CHOICES = (
        ('Publico', 'Publico'),
        ('Privado', 'Privado'),
    )

    idUser = models.AutoField(primary_key=True)
    NomUser = models.CharField(max_length=45)
    SecondNomUser = models.CharField(max_length=45, null=True, blank=True)
    ApePatUser = models.CharField(max_length=45)
    ApeMatUser = models.CharField(max_length=45)
    UserName = models.CharField(max_length=45, unique=True)
    CorreoUser = models.EmailField(max_length=255, unique=True)
    # PassUser se renombra a password para que Django lo reconozca
    password = models.CharField(max_length=255)
    FotoUser = models.JSONField(null=True, blank=True)
    idCarrera = models.ForeignKey(Carrera, on_delete=models.SET_NULL, null=True, blank=True)
    TipoUser = models.CharField(max_length=15, choices=TIPO_USUARIO_CHOICES)
    # last_login es un campo que AbstractBaseUser espera, se renombra LastLogin
    last_login = models.DateTimeField(null=True, blank=True)
    FechUnido = models.DateTimeField(auto_now_add=True)
    PrivacidadUser = models.CharField(max_length=10, choices=PRIVACIDAD_CHOICES, default='Publico')
    is_profile_complete = models.BooleanField(default=False)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = 'CorreoUser'
    REQUIRED_FIELDS = ['UserName', 'NomUser', 'ApePatUser', 'ApeMatUser']

    class Meta:
        db_table = 'Usuario'

    def __str__(self):
        return self.UserName

class Grupo(models.Model):
    PRIVACIDAD_CHOICES = (
        ('Publico', 'Publico'),
        ('Privado', 'Privado'),
    )

    idGrupo = models.AutoField(primary_key=True)
    NomGrupo = models.CharField(max_length=45)
    DescGrupo = models.CharField(max_length=255, null=True, blank=True)
    PrivGrupo = models.CharField(max_length=10, choices=PRIVACIDAD_CHOICES, default='Publico')
    FechCreaGrupo = models.DateTimeField(auto_now_add=True)
    idUser = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='idUser') # Creador del grupo

    class Meta:
        db_table = 'Grupo'

    def __str__(self):
        return self.NomGrupo

class UsuarioGrupo(models.Model):
    ROL_CHOICES = (
        ('Miembro', 'Miembro'),
        ('Admin', 'Admin'),
    )

    idUsuarioGrupo = models.AutoField(primary_key=True)
    IngresoGrupo = models.DateTimeField(auto_now_add=True)
    Rol = models.CharField(max_length=10, choices=ROL_CHOICES, default='Miembro')
    idGrupo = models.ForeignKey(Grupo, on_delete=models.CASCADE, db_column='idGrupo')
    idUser = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='idUser')

    class Meta:
        db_table = 'UsuarioGrupo'
        unique_together = ('idGrupo', 'idUser') # Evita duplicados de usuario en un grupo

    def __str__(self):
        return f"{self.idUser.UserName} en {self.idGrupo.NomGrupo}"

class Post(models.Model):
    idPost = models.AutoField(primary_key=True)
    TextPost = models.CharField(max_length=255, null=True, blank=True)
    # Solo aceptar imagenes y videos
    MediaPost = models.FileField(upload_to='', null=True, blank=True, help_text='Solo imágenes o videos')
    FechCreacPost = models.DateTimeField(auto_now_add=True)
    FechUpdatePost = models.DateTimeField(null=True, blank=True)
    SentimientoScore = models.FloatField(null=True, blank=True)
    SentimientoLabel = models.CharField(max_length=255, null=True, blank=True)
    idUser = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='idUser')
    idGrupo = models.ForeignKey(Grupo, on_delete=models.SET_NULL, null=True, blank=True, db_column='idGrupo')

    class Meta:
        db_table = 'Post'

    def __str__(self):
        return f"Post by {self.idUser.UserName} at {self.FechCreacPost}"

class Comentario(models.Model):
    idComentario = models.AutoField(primary_key=True)
    TextComentario = models.CharField(max_length=255)
    FechCreacComen = models.DateTimeField(auto_now_add=True)
    FechUpdateComen = models.DateTimeField(null=True, blank=True)
    SentimientoScoreCom = models.FloatField(null=True, blank=True)
    SentimientoLabelCom = models.CharField(max_length=255, null=True, blank=True)
    idPost = models.ForeignKey(Post, on_delete=models.CASCADE, db_column='idPost')
    idUser = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='idUser')

    class Meta:
        db_table = 'Comentario'

    def __str__(self):
        return f"Comment by {self.idUser.UserName} on {self.idPost}"

class Evento(models.Model):
    idEvento = models.AutoField(primary_key=True)
    TituloEvent = models.CharField(max_length=45)
    DescEvent = models.CharField(max_length=255, null=True, blank=True)
    FechEvent = models.DateTimeField()
    LugarEvent = models.CharField(max_length=255, null=True, blank=True)
    Asistencia = models.IntegerField(default=0, null=True, blank=True)
    idUser = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='idUser')

    class Meta:
        db_table = 'Evento'

    def __str__(self):
        return self.TituloEvent

class Chatbot(models.Model):
    idChatbot = models.AutoField(primary_key=True)
    idUser = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='idUser')
    FechInterac = models.DateTimeField(auto_now_add=True)
    UserQuery = models.CharField(max_length=255)
    Response = models.CharField(max_length=255)
    Topic = models.CharField(max_length=45, null=True, blank=True)

    class Meta:
        db_table = 'Chatbot'

    def __str__(self):
        return f"Chat with {self.idUser.UserName} at {self.FechInterac}"

class MensajeDirecto(models.Model):
    idMensajeDirecto = models.AutoField(primary_key=True)
    sendUser = models.ForeignKey(Usuario, related_name='sent_messages', on_delete=models.CASCADE, db_column='sendUser')
    receiveUser = models.ForeignKey(Usuario, related_name='received_messages', on_delete=models.CASCADE, db_column='receiveUser')
    Mensaje = models.CharField(max_length=255, null=True, blank=True)
    MediaMensaje = models.JSONField(null=True, blank=True)
    FechMensaje = models.DateTimeField(auto_now_add=True)
    FechUpdateMensaje = models.DateTimeField(null=True, blank=True)
    Leido = models.BooleanField(default=False)

    class Meta:
        db_table = 'MensajeDirecto'

    def __str__(self):
        return f"Message from {self.sendUser.UserName} to {self.receiveUser.UserName}"

class Notificacion(models.Model):
    TIPO_ENTREGA_CHOICES = (
        ('web', 'web'),
        ('mail', 'mail'),
    )

    idNotificacion = models.AutoField(primary_key=True)
    idUser = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='idUser')
    TipoNot = models.CharField(max_length=45)
    MensajeNot = models.CharField(max_length=255)
    FechEnviado = models.DateTimeField(auto_now_add=True)
    TipoEntrega = models.CharField(max_length=4, choices=TIPO_ENTREGA_CHOICES)

    class Meta:
        db_table = 'Notificacion'

    def __str__(self):
        return f"Notification for {self.idUser.UserName}: {self.TipoNot}"