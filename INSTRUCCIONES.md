# Guía de Ejecución del Proyecto

Este documento detalla los pasos para ejecutar el proyecto en tu entorno local (Mac).

## 1. Requisitos Previos

Asegúrate de tener instalado lo siguiente:
- **Python 3.10+**
- **Node.js 16+** y **npm**
- **PostgreSQL** (Base de datos)

## 2. Configuración de la Base de Datos

El proyecto está configurado para usar PostgreSQL. Debes crear una base de datos llamada `estadia`.

1. Abre tu terminal y asegúrate de que PostgreSQL esté corriendo.
2. Entra a la consola de postgres (o usa una herramienta gráfica como pgAdmin/TablePlus):
   ```bash
   psql postgres
   ```
3. Crea la base de datos:
   ```sql
   CREATE DATABASE estadia;
   ```
4. **IMPORTANTE**: Verifica la configuración en `tesis_upemor/settings.py`.
   Actualmente está configurado así:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'estadia',
           'USER': 'imanolcier',  # <--- Verifica si este es tu usuario de base de datos correcto
           'PASSWORD': '',        # <--- Coloca tu contraseña si tienes una
           'HOST': 'localhost',
           'PORT': '5432',
       }
   }
   ```
   Si tu usuario de sistema es `imanolciermini`, es probable que necesites cambiar `'USER': 'imanolcier'` por `'USER': 'imanolciermini'` o el usuario que uses en Postgres.

## 3. Configuración del Backend (Django)

1. **Crear archivo de variables de entorno**:
   Crea un archivo llamado `.env` en la raíz del proyecto (al mismo nivel que `manage.py`) y agrega las siguientes claves (llena los valores que tengas):
   ```env
   EMAIL_HOST_USER=tu_correo@gmail.com
   EMAIL_HOST_PASSWORD=tu_contraseña_de_aplicacion
   GEMINI_API_KEY=tu_api_key
   HUGGINGFACE_API_KEY=tu_api_key
   OPENAI_API_KEY=tu_api_key
   ```

2. **Crear entorno virtual e instalar dependencias**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
   *Nota: Si tienes problemas instalando `psycopg2-binary` o `mysqlclient`, asegúrate de tener las librerías de desarrollo instaladas (`brew install postgresql` o `brew install mysql-client`).*

3. **Migrar la base de datos**:
   ```bash
   python manage.py migrate
   ```

4. **Correr el servidor**:
   ```bash
   python manage.py runserver
   ```
   El backend estará corriendo en `http://localhost:8000`.

## 4. Configuración del Frontend (React)

1. Abre una **nueva terminal**.
2. Navega a la carpeta `frontend`:
   ```bash
   cd frontend
   ```
3. Instala las dependencias:
   ```bash
   npm install
   ```
   *Si hay conflictos de versiones, intenta con `npm install --legacy-peer-deps`.*

4. Inicia el servidor de desarrollo:
   ```bash
   npm start
   ```
   El frontend se abrirá en `http://localhost:3000`.

## 5. Crear Superusuario (Administrador)

Para acceder al panel de administración de Django (`http://localhost:8000/admin`), necesitas crear un superusuario.

1. Asegúrate de estar en la carpeta raíz del proyecto y con el entorno virtual activado.
2. Ejecuta el siguiente comando:
   ```bash
   python manage.py createsuperuser
   ```
3. Se te pedirán los siguientes datos (debido al modelo de usuario personalizado):
   - **CorreoUser**: Tu correo electrónico (este será tu login principal).
   - **UserName**: Nombre de usuario único.
   - **NomUser**: Tu nombre.
   - **ApePatUser**: Tu apellido paterno.
   - **ApeMatUser**: Tu apellido materno.
   - **Password**: Tu contraseña.

---
¡Listo! Ahora deberías tener el proyecto funcionando.
