# Guía Rápida para Desarrolladores

Este proyecto tiene un backend en Django y un frontend en React.

## 🚦 Requisitos Previos
- Python 3.10+
- Node.js 16+
- npm
- Git
- PostgreSQL o MySQL instalado (depende tu configuración)

## 🚀 Instalación y Ejecución Local

### 1. Clona el repositorio
```bash
git clone <URL_DE_TU_REPO>
cd Estadia
```

### 2. Configura el entorno de variables
- Copia el archivo `.example.env` y renómbralo como `.env`:
```bash
cp .example.env .env
```
- Edita el archivo `.env` y coloca tus valores reales (database, correo, claves, etc)

### 3. Configura el Backend (Django)
```bash
# Crea y activa un entorno virtual (solo necesario la 1ra vez):
python -m venv venv
venv\Scripts\activate  # en Windows
source venv/bin/activate  # en Mac/Linux

# Instala dependencias
pip install -r requirements.txt

# Aplica migraciones y corre el servidor
python manage.py migrate
python manage.py runserver
```

### 4. Configura el Frontend (React)
```bash
cd frontend
npm install
npm start
```

El frontend estará en http://localhost:3000 y el backend en http://localhost:8000.

---

## Archivos importantes que NO debes subir
tu entorno virtual, node_modules, archivos .env, PDFs, carpetas de build o compilados, etc. (ya cubiertos en el .gitignore)

Cualquier duda, revisa el código o contacta a los autores.
