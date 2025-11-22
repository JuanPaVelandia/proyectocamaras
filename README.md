# Sistema de Monitoreo con Frigate + Alertas Inteligentes

Sistema completo de monitoreo de cámaras de seguridad con detección de objetos, reglas inteligentes y notificaciones por WhatsApp.

## 🚀 Inicio Rápido

### Requisitos Previos

- **Docker Desktop** (Windows/Mac) o **Docker + Docker Compose** (Linux)
  - [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Git** (opcional, para clonar el repositorio)
- **Mínimo 4GB RAM** recomendado
- **Espacio en disco**: ~2GB para imágenes Docker + espacio para grabaciones

### Instalación Automática

#### Windows
```powershell
# Ejecutar el script de instalación
.\install.ps1
```

#### Linux/Mac
```bash
# Ejecutar el script de instalación
chmod +x install.sh
./install.sh
```

### Instalación Manual

1. **Descargar o clonar el proyecto**
   ```bash
   git clone <tu-repositorio>
   cd frigate
   ```

2. **Configurar variables de entorno**
   - Copiar archivos `.env.example` a `.env` en:
     - `backend/.env`
     - `python-listener/.env`
   - Editar y configurar:
     - Credenciales de base de datos
     - Token de WhatsApp Business API
     - Número de teléfono de WhatsApp

3. **Configurar Frigate**
   - Editar `config/config.yml` con tus cámaras IP
   - Ver [Documentación de Frigate](https://docs.frigate.video/)

4. **Iniciar el sistema**
   ```bash
   docker-compose up -d
   ```

5. **Verificar que todo funciona**
   - Frigate UI: http://localhost:5000
   - Backend API: http://localhost:8000
   - Frontend: http://localhost:5173 (si lo ejecutas localmente)

## 📋 Componentes del Sistema

- **Frigate NVR**: Procesamiento de video y detección de objetos
- **Mosquitto MQTT**: Broker para comunicación entre servicios
- **Backend FastAPI**: API REST para gestión de reglas y eventos
- **Frontend React**: Panel de administración web
- **PostgreSQL**: Base de datos para eventos y reglas
- **Listener Python**: Conecta MQTT con el backend

## 🔧 Configuración

### Variables de Entorno Importantes

#### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/frigate_events
JWT_SECRET_KEY=tu-clave-secreta-aqui
ADMIN_USERNAME=admin
ADMIN_PASSWORD=tu-password-seguro
WHATSAPP_TOKEN=tu-token-de-whatsapp
WHATSAPP_PHONE_NUMBER_ID=tu-phone-id
```

#### Listener (`python-listener/.env`)
```env
MQTT_HOST=mosquitto
MQTT_PORT=1883
CLOUD_API_URL=http://backend:8000/api/events/
CLOUD_API_KEY=super-token-secreto
```

### Configuración de Cámaras

Edita `config/config.yml` para agregar tus cámaras:

```yaml
cameras:
  nombre_camara:
    ffmpeg:
      inputs:
        - path: rtsp://usuario:password@ip-camara:puerto/stream
          roles:
            - detect
            - record
    detect:
      width: 1920
      height: 1080
      fps: 5
```

## 📖 Uso

### Acceder al Panel de Administración

1. Inicia el frontend (si está en desarrollo):
   ```bash
   cd Frontend/rules-panel
   npm install
   npm run dev
   ```

2. Abre http://localhost:5173 en tu navegador

3. Inicia sesión con:
   - Usuario: `admin` (o el configurado en `.env`)
   - Contraseña: La configurada en `ADMIN_PASSWORD`

### Crear Reglas de Notificación

1. Ve a la pestaña "Reglas"
2. Completa el formulario:
   - **Nombre**: Nombre descriptivo de la regla
   - **Cámara**: Selecciona la cámara desde el menú desplegable
   - **Objetos**: Selecciona uno o más objetos a detectar
   - **Score mínimo**: Confianza mínima (0.0 - 1.0)
   - **Duración**: Tiempo mínimo en segundos
   - **Rango horario**: Hora de inicio y fin (opcional)
   - **Mensaje personalizado**: Mensaje para WhatsApp (opcional)

3. Haz clic en "Crear Regla"

### Ver Eventos y Activaciones

- **Activaciones**: Muestra cuándo se activaron las reglas
- **Eventos**: Lista todos los eventos detectados por Frigate

## 🛠️ Comandos Útiles

### Gestión de Contenedores
```bash
# Iniciar todos los servicios
docker-compose up -d

# Detener todos los servicios
docker-compose down

# Ver logs
docker-compose logs -f

# Reiniciar un servicio específico
docker-compose restart backend

# Reconstruir imágenes
docker-compose build --no-cache
```

### Base de Datos
```bash
# Ejecutar migraciones
docker exec frigate_backend python migrate_add_time_fields.py

# Acceder a PostgreSQL
docker exec -it frigate_db psql -U postgres -d frigate_events
```

### Verificación
```bash
# Verificar endpoints del backend
docker exec frigate_backend python verificar_endpoints.py

# Verificar estado del sistema
docker-compose ps
```

## 🔍 Solución de Problemas

### El backend no inicia
- Verifica que PostgreSQL esté corriendo: `docker-compose ps db`
- Revisa los logs: `docker-compose logs backend`
- Verifica las variables de entorno en `backend/.env`

### No se reciben eventos
- Verifica que MQTT esté funcionando: `docker-compose logs mosquitto`
- Verifica que el listener esté corriendo: `docker-compose logs listener`
- Revisa la configuración de Frigate en `config/config.yml`

### No se envían mensajes de WhatsApp
- Verifica que `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` estén configurados
- Revisa los logs del backend: `docker-compose logs backend | grep -i whatsapp`
- Verifica que el número de teléfono esté en formato internacional (ej: +521234567890)

### Las cámaras no aparecen en el select
- Verifica que Frigate esté corriendo: http://localhost:5000
- Revisa la configuración de cámaras en `config/config.yml`
- Verifica los logs: `docker-compose logs frigate`

## 📚 Documentación Adicional

- [Documentación de Frigate](https://docs.frigate.video/)
- [API de WhatsApp Business](https://developers.facebook.com/docs/whatsapp)
- [Documentación de Docker Compose](https://docs.docker.com/compose/)

## 🤝 Soporte

Para problemas o preguntas:
1. Revisa la sección de Solución de Problemas
2. Consulta los logs: `docker-compose logs`
3. Verifica la documentación de cada componente

## 📝 Licencia

[Especificar licencia aquí]

