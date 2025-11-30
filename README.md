# 🎥 Sistema de Monitoreo Inteligente con Frigate + IA

Sistema completo de monitoreo de cámaras con detección de objetos por IA, alertas automáticas por WhatsApp con imágenes, y panel de control web profesional.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Docker](https://img.shields.io/badge/docker-ready-blue)

## ✨ Características

- 🎯 **Detección de objetos con IA** - Personas, vehículos, animales, paquetes y más
- 📱 **Alertas por WhatsApp con imágenes** - Recibe snapshots del evento detectado
- 🌐 **Panel web responsive** - Gestiona reglas, cámaras, eventos y perfil
- 👤 **Sistema multi-usuario** - Cada usuario con sus propias reglas y alertas
- ⚙️ **Motor de reglas personalizable** - Horarios, objetos, score mínimo, duración
- 🌍 **Selector de país internacional** - Validación de números WhatsApp con banderas
- 🔐 **Autenticación segura** - JWT + bcrypt, aislamiento de datos por usuario
- 🐳 **Docker Compose** - Instalación lista en un solo comando
- 📊 **Historial completo** - Eventos, activaciones de reglas, y estadísticas

---

## 📦 Dos Modos de Instalación

### 🏠 Modo Cliente (Recomendado para la mayoría)

**Usa el backend centralizado en la nube. Solo instalas Frigate localmente.**

- ✅ **Instalación en 3 minutos**
- ✅ No necesitas base de datos propia
- ✅ No necesitas backend propio
- ✅ Accede al panel web desde cualquier lugar
- ✅ Backend actualizado automáticamente

👉 **[Ver guía de instalación cliente →](README.CLIENT.md)**

### 🖥️ Modo Completo (Self-hosted)

**Instalación completa con tu propio backend y base de datos.**

- ⚙️ Control total del sistema
- 🔒 Datos 100% en tu servidor
- 🛠️ Personalización avanzada
- 📊 Base de datos propia

👉 **Continúa leyendo esta guía para instalación completa**

---

## 🚀 Instalación Completa (Self-hosted)

### Requisitos Previos

- **Docker** y **Docker Compose** instalados
  - Windows: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - Linux: `sudo apt install docker.io docker-compose`
  - Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

- **Cámara IP con RTSP** (opcional para pruebas iniciales)

### Paso 1: Descargar el Proyecto

```bash
git clone https://github.com/JuanPaVelandia/proyectocamaras.git
cd proyectocamaras
```

### Paso 2: Configurar Variables de Entorno

Crea los archivos de configuración a partir de los ejemplos:

```bash
# Backend
cp backend/.env.example backend/.env

# Listener
cp python-listener/.env.example python-listener/.env
```

**Edita `backend/.env`** (WhatsApp es opcional, lo puedes configurar después):

```env
# Base de datos
DATABASE_URL=postgresql://postgres:postgres@db:5432/frigate_events

# JWT (cambiar en producción)
JWT_SECRET_KEY=super-secret-key-change-in-production

# Usuario admin por defecto
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin123!
DEFAULT_ADMIN_WHATSAPP=+573001234567

# WhatsApp Business API (OPCIONAL - configurar después)
WHATSAPP_TOKEN=tu_token_de_meta_aqui
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id_aqui

# Frigate
FRIGATE_HOST=http://frigate:5000
FRIGATE_CONFIG_PATH=/config/config.yml
```

### Paso 3: Iniciar el Sistema

```bash
docker-compose up -d
```

Esto iniciará:
- ✅ Mosquitto (MQTT Broker)
- ✅ Frigate (Detección IA)
- ✅ PostgreSQL (Base de datos)
- ✅ Backend (FastAPI)
- ✅ Listener (MQTT → Backend)

Espera ~2-3 minutos mientras descarga las imágenes (~2GB).

### Paso 4: Acceder al Sistema

#### **Frigate (Interfaz de Cámaras)**
- URL: http://localhost:5000
- Usuario: `admin`
- Contraseña: Se genera al primer inicio (ver logs)

#### **Backend API**
- URL: http://localhost:8000
- Health check: http://localhost:8000/health
- Documentación interactiva: http://localhost:8000/docs

#### **Panel Web (Frontend)**

```bash
cd Frontend/rules-panel
npm install
npm run dev
```

Abre: http://localhost:5173

### Paso 5: Crear tu Usuario

1. En el panel web, click en **"Crear Cuenta"**
2. Completa el formulario:
   - Username
   - Email
   - Contraseña (mínimo 8 caracteres, 1 mayúscula, 1 número)
   - Selecciona tu país 🇨🇴
   - Ingresa tu número de WhatsApp
   - ✅ Activa: "Recibir alertas por WhatsApp"
3. Click **"Crear Cuenta"**

¡Listo! Ya tienes acceso al panel de control.

---

## 📷 Configurar tu Primera Cámara

### Opción A: Cámara Real (RTSP)

1. **Abre Frigate:** http://localhost:5000

2. **Ve a Settings → Config Editor**

3. **Agrega tu cámara** al archivo `config.yml`:

```yaml
cameras:
  camara_entrada:  # Nombre único de tu cámara
    enabled: true
    ffmpeg:
      inputs:
        - path: rtsp://usuario:password@192.168.1.100:554/stream1
          roles:
            - detect    # Para detección de objetos
            - record    # Para grabar video
    detect:
      width: 1920
      height: 1080
      fps: 5          # 5 FPS es suficiente para detección
    objects:
      track:
        - person      # Detectar personas
        - car         # Detectar vehículos
        - dog         # Detectar perros
        - cat         # Detectar gatos
```

4. **Guarda** y **reinicia Frigate:**

```bash
docker-compose restart frigate
```

### Opción B: Cámara de Prueba

Para probar sin cámara física, puedes usar una cámara pública:

```yaml
cameras:
  test_camera:
    enabled: true
    ffmpeg:
      inputs:
        - path: https://demo.rtsp.stream/pattern
          roles:
            - detect
    detect:
      width: 1280
      height: 720
      fps: 5
```

### Encontrar la URL RTSP de tu Cámara

**Formatos comunes:**
- Hikvision: `rtsp://user:pass@ip:554/Streaming/Channels/101`
- Dahua: `rtsp://user:pass@ip:554/cam/realmonitor?channel=1&subtype=0`
- TP-Link: `rtsp://user:pass@ip:554/stream1`
- Reolink: `rtsp://user:pass@ip:554/h264Preview_01_main`
- ONVIF genérico: `rtsp://user:pass@ip:554/stream1`

**Verificar con VLC:**
```bash
vlc rtsp://usuario:password@192.168.1.100:554/stream1
```

---

## 🔔 Configurar Alertas de WhatsApp

### Paso 1: Crear App de WhatsApp Business

1. **Ve a:** https://developers.facebook.com/apps/
2. **Crea una nueva app:**
   - Selecciona "Business" como tipo
   - Agrega "WhatsApp" como producto
3. **Configura WhatsApp:**
   - Ve a "WhatsApp → Getting Started"
   - Copia tu **Temporary Access Token**
   - Copia tu **Phone Number ID**

### Paso 2: Obtener Token de Larga Duración (60 días)

Para que no expire cada 24 horas:

1. Ve a tu app → Settings → Basic
2. Copia tu **App ID** y **App Secret**
3. Ejecuta este curl (reemplaza los valores):

```bash
curl "https://graph.facebook.com/v17.0/oauth/access_token?grant_type=fb_exchange_token&client_id=TU_APP_ID&client_secret=TU_APP_SECRET&fb_exchange_token=TU_TOKEN_TEMPORAL"
```

Respuesta:
```json
{
  "access_token": "EAAL...nuevo_token_largo",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

### Paso 3: Configurar en el Backend

Edita `backend/.env`:

```bash
WHATSAPP_TOKEN=EAAL...tu_token_de_larga_duracion
WHATSAPP_PHONE_NUMBER_ID=842522045618386
```

Reinicia el backend:

```bash
docker-compose restart backend
```

### Paso 4: Configurar tu Número en el Perfil

1. Accede al panel web
2. Click en tu **avatar** (arriba derecha) → **Mi Perfil**
3. En la sección "Notificaciones de WhatsApp":
   - Selecciona tu país 🇨🇴
   - Ingresa tu número: `311 226 4829`
   - Activa: ✅ **Recibir alertas por WhatsApp**
4. Click **"Guardar Cambios"**

El sistema guardará: `+573112264829`

### Paso 5: Crear una Regla

1. Ve a la pestaña **"Reglas"**
2. Click en **"+ Nueva Regla"**
3. Configura:
   - **Nombre:** "Persona en la entrada"
   - **Cámara:** `camara_entrada`
   - **Objetos:** `person`
   - **Score mínimo:** `0.7` (70% de confianza)
   - **Duración mínima:** `2` segundos
   - **Horario:** `22:00 - 06:00` (solo de noche, opcional)
   - **Mensaje personalizado:**
     ```
     🚨 Alerta: {label} detectado en {camera}
     Confianza: {score}%
     Duración: {duration}s
     ```
4. Click **"Crear Regla"**

¡Listo! Cuando Frigate detecte una persona en esa cámara, recibirás:
- 📸 Imagen del evento (snapshot)
- 💬 Mensaje con detalles

---

## 🏗️ Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────┐
│                  FRONTEND (React)                     │
│            http://localhost:5173                      │
│  • Panel de control                                   │
│  • Gestión de reglas                                  │
│  • Perfil de usuario                                  │
│  • Selector de país con validación                    │
└───────────────────┬──────────────────────────────────┘
                    │ HTTP REST API
┌───────────────────▼──────────────────────────────────┐
│              BACKEND (FastAPI + Python)               │
│            http://localhost:8000                      │
│  • Motor de Reglas                                    │
│  • Autenticación JWT                                  │
│  • Envío WhatsApp con imágenes                        │
│  • API REST completa                                  │
└──────┬──────────────────────────┬────────────────────┘
       │                          │
       │                          │ PostgreSQL
       │                     ┌────▼─────┐
       │                     │    DB    │
       │                     │ postgres │
       │                     └──────────┘
       │
       │ HTTP Webhooks
┌──────▼──────────────────────────────────────────────┐
│           LISTENER (Python MQTT Client)              │
│  • Escucha eventos de Frigate via MQTT               │
│  • Convierte MQTT → HTTP                             │
│  • Envía eventos al backend                          │
└──────▲──────────────────────────────────────────────┘
       │ MQTT (mosquitto)
┌──────┴──────────────────────────────────────────────┐
│              FRIGATE (NVR + IA)                      │
│            http://localhost:5000                     │
│  • Procesamiento de video RTSP                       │
│  • Detección de objetos (TensorFlow Lite)           │
│  • Snapshots + Grabaciones                           │
│  • Publica eventos via MQTT                          │
└──────▲──────────────────────────────────────────────┘
       │ RTSP Stream
┌──────┴──────┐
│   CÁMARAS   │
│     IP      │
└─────────────┘
```

---

## 📂 Estructura del Proyecto

```
proyectocamaras/
├── backend/                         # Backend FastAPI
│   ├── app/
│   │   ├── api/endpoints/          # Endpoints REST
│   │   │   ├── auth.py            # Login, register, perfil
│   │   │   ├── cameras.py         # Gestión de cámaras
│   │   │   ├── rules.py           # CRUD de reglas
│   │   │   └── events.py          # Eventos de Frigate
│   │   ├── models/                # Modelos SQLAlchemy
│   │   │   └── all_models.py
│   │   ├── services/              # Lógica de negocio
│   │   │   ├── whatsapp.py        # Envío WhatsApp
│   │   │   └── rule_engine.py     # Motor de reglas
│   │   └── core/
│   │       └── security.py        # JWT, bcrypt
│   ├── .env                       # Configuración
│   ├── Dockerfile
│   └── requirements.txt
│
├── Frontend/rules-panel/           # Frontend React + Vite
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/              # Login, registro
│   │   │   ├── profile/           # Página de perfil
│   │   │   ├── rules/             # CRUD reglas
│   │   │   ├── events/            # Lista eventos
│   │   │   └── cameras/           # Gestión cámaras
│   │   ├── components/
│   │   │   └── ui/
│   │   │       ├── PhoneInput.jsx  # Selector de país
│   │   │       ├── Button.jsx
│   │   │       ├── Input.jsx
│   │   │       └── Card.jsx
│   │   └── services/
│   │       └── api.js             # Cliente API
│   └── package.json
│
├── python-listener/                # MQTT → HTTP Bridge
│   ├── listener.py
│   ├── .env
│   └── Dockerfile
│
├── config/
│   └── config.yml                 # Configuración Frigate
│
├── docker-compose.yml             # Orquestación completa
└── README.md                      # Este archivo
```

---

## 🛠️ Comandos Útiles

### Gestión de Contenedores

```bash
# Iniciar todo
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frigate
docker-compose logs -f listener

# Reiniciar un servicio
docker-compose restart backend

# Detener todo
docker-compose down

# Detener y eliminar volúmenes (¡CUIDADO! borra la BD)
docker-compose down -v
```

### Base de Datos

```bash
# Acceder a PostgreSQL
docker exec -it frigate_db psql -U postgres -d frigate_events

# Ver tablas
\dt

# Ver usuarios
SELECT id, username, email, whatsapp_number, whatsapp_notifications_enabled FROM users;

# Ver reglas
SELECT id, name, camera, label, enabled FROM rules;

# Ver eventos
SELECT id, camera, label, score, created_at FROM events ORDER BY created_at DESC LIMIT 10;
```

### Verificación del Sistema

```bash
# Health check del backend
curl http://localhost:8000/health

# Ver configuración de Frigate
curl http://localhost:5000/api/config

# Verificar que todos los contenedores están corriendo
docker-compose ps
```

---

## 🔧 Configuración Avanzada

### Múltiples Cámaras

Agrega más cámaras en `config/config.yml`:

```yaml
cameras:
  camara_entrada:
    # ... configuración ...

  camara_jardin:
    enabled: true
    ffmpeg:
      inputs:
        - path: rtsp://user:pass@192.168.1.101:554/stream1
          roles:
            - detect
            - record
    detect:
      width: 1920
      height: 1080
      fps: 5
    objects:
      track:
        - person
        - car

  camara_cochera:
    enabled: true
    # ... configuración ...
```

### Zonas de Detección

Para detectar solo en áreas específicas:

```yaml
cameras:
  camara_entrada:
    # ... configuración base ...
    zones:
      entrada_principal:
        coordinates: 100,100,500,100,500,400,100,400
        objects:
          - person
```

### Mensajes Personalizados por Regla

Usa variables en tus mensajes:

- `{camera}` - Nombre de la cámara
- `{label}` - Objeto detectado
- `{score}` - Score como porcentaje
- `{duration}` - Duración en segundos
- `{event_id}` - ID del evento
- `{rule_name}` - Nombre de la regla

Ejemplo:
```
🚨 {rule_name}

📹 Cámara: {camera}
👤 Detectado: {label}
📊 Confianza: {score}%
⏱️ Duración: {duration}s

ID: {event_id}
```

### Cambiar Puertos

Edita `docker-compose.yml`:

```yaml
services:
  frigate:
    ports:
      - "5001:5000"  # Frigate en puerto 5001

  backend:
    ports:
      - "8001:8000"  # Backend en puerto 8001
```

---

## 🐛 Solución de Problemas

### Frigate no detecta objetos

**Problema:** Las cámaras se ven pero no detectan nada.

**Solución:**
1. Verifica que el detector esté activo:
   ```yaml
   detect:
     enabled: true
     fps: 5
   ```
2. Verifica que los objetos estén en la lista:
   ```yaml
   objects:
     track:
       - person
   ```
3. Revisa los logs: `docker-compose logs frigate | grep -i detect`

### Backend no arranca

**Problema:** `docker-compose up` falla en el backend.

**Solución:**
```bash
# Ver el error específico
docker-compose logs backend

# Problemas comunes:
# 1. BD no lista: esperar 10 segundos y reintentar
docker-compose restart backend

# 2. Error en migraciones
docker exec -it frigate_backend python migrate_add_cameras_table.py
docker exec -it frigate_backend python migrate_add_whatsapp_enabled.py
```

### No llegan alertas de WhatsApp

**Problema:** Las reglas se activan pero no llega WhatsApp.

**Solución:**
1. Verifica el token:
   ```bash
   docker-compose logs backend | grep "WHATSAPP"
   ```

2. Verifica que el token no esté expirado:
   - Ve a: https://developers.facebook.com/apps/
   - Genera nuevo token si es necesario

3. Verifica el número de teléfono:
   - Debe estar en formato internacional: `+573001234567`
   - Notificaciones activadas en el perfil

4. Verifica los logs al momento del evento:
   ```bash
   docker-compose logs -f backend | grep -i whatsapp
   ```

### Cámara no se conecta

**Problema:** "Camera not found" o stream falla.

**Solución:**
1. Verifica la URL con VLC:
   ```bash
   vlc rtsp://user:pass@ip:554/stream1
   ```

2. Verifica usuario y contraseña

3. Verifica que la cámara permita múltiples conexiones

4. Prueba con `ffmpeg`:
   ```bash
   ffmpeg -i rtsp://user:pass@ip:554/stream1 -frames:v 1 test.jpg
   ```

### Error "Failed to resolve 'frigate'"

**Problema:** Backend no puede acceder a Frigate desde Railway.

**Solución:** Usa Ngrok o Cloudflare Tunnel (ver sección siguiente).

---

## 🌐 Exponer Frigate desde Internet (Railway + Ngrok)

Si tu backend está en Railway y Frigate en local, necesitas exponerlo:

### Opción 1: Ngrok (Rápido, para pruebas)

```bash
# Instalar ngrok
# Windows: https://ngrok.com/download
# O con Chocolatey: choco install ngrok

# Autenticar
ngrok config add-authtoken tu_token

# Exponer Frigate
ngrok http 5000
```

Copia la URL que aparece (ej: `https://abc123.ngrok-free.app`)

**En Railway, configura:**
```
FRIGATE_HOST=https://abc123.ngrok-free.app
```

### Opción 2: Cloudflare Tunnel (Permanente, gratis)

```bash
# Instalar cloudflared
# Windows: choco install cloudflared

# Login
cloudflared tunnel login

# Crear túnel
cloudflared tunnel create frigate

# Ejecutar
cloudflared tunnel run --url http://localhost:5000 frigate
```

---

## 🚢 Deploy en Producción

### Backend → Railway

1. Crea cuenta: https://railway.app/
2. New Project → Deploy from GitHub
3. Selecciona tu repositorio
4. Configura variables de entorno:
   ```
   DATABASE_URL=<railway_postgres_url>
   JWT_SECRET_KEY=<generar_aleatorio>
   WHATSAPP_TOKEN=<tu_token>
   WHATSAPP_PHONE_NUMBER_ID=<tu_id>
   FRIGATE_HOST=<ngrok_o_cloudflare_url>
   ```
5. Deploy

### Frontend → Vercel

1. Crea cuenta: https://vercel.com/
2. Import Project → GitHub
3. Selecciona `Frontend/rules-panel`
4. Deploy

### Frigate → Local con Tunnel

Mantén Frigate en tu red local y expónlo con Cloudflare Tunnel.

---

## 🔐 Seguridad

### Producción

⚠️ **Antes de exponer a internet:**

1. **Cambiar credenciales por defecto:**
   ```env
   JWT_SECRET_KEY=<generar_con_openssl_rand_base64_32>
   ADMIN_PASSWORD=<contraseña_fuerte>
   POSTGRES_PASSWORD=<contraseña_segura>
   ```

2. **Configurar HTTPS:**
   - Usa reverse proxy (Nginx, Traefik, Caddy)
   - Certificados SSL (Let's Encrypt)

3. **Restringir acceso:**
   - Firewall
   - VPN (WireGuard, Tailscale)
   - Autenticación de dos factores

4. **Limitar CORS:**
   ```env
   CORS_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
   ```

---

## 📊 Características Adicionales

### Página de Perfil

- ✅ Edición de email
- ✅ Selector de país con banderas
- ✅ Validación de número WhatsApp
- ✅ Toggle de notificaciones
- ✅ Cambio de contraseña seguro

### Motor de Reglas

- ✅ Múltiples objetos por regla
- ✅ Score mínimo configurable
- ✅ Duración mínima
- ✅ Rango horario (con soporte para cruzar medianoche)
- ✅ Mensajes personalizados con variables
- ✅ Historial de activaciones

### Sistema Multi-Usuario

- ✅ Registro con validación de email
- ✅ Cada usuario ve solo sus reglas
- ✅ Cada usuario recibe sus propias alertas
- ✅ Aislamiento completo de datos

---

## 🎉 ¡Listo!

Si seguiste todos los pasos, deberías tener:

- ✅ Frigate detectando objetos en tiempo real
- ✅ Backend procesando eventos
- ✅ Panel web para gestionar todo
- ✅ Alertas de WhatsApp con imágenes
- ✅ Sistema multi-usuario funcionando

---

## 📞 Soporte

¿Problemas? ¿Preguntas?

1. Revisa la sección **"Solución de Problemas"**
2. Consulta los logs: `docker-compose logs`
3. Abre un issue en GitHub
4. Consulta la documentación:
   - [Frigate Docs](https://docs.frigate.video/)
   - [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
   - [FastAPI Docs](https://fastapi.tiangolo.com/)

---

## 📝 Licencia

MIT License - Libre para uso personal y comercial.

---

## 🙏 Créditos

- **Frigate NVR** - https://frigate.video/
- **FastAPI** - https://fastapi.tiangolo.com/
- **React** - https://react.dev/
- **WhatsApp Business API** - https://developers.facebook.com/docs/whatsapp

---

**Hecho con ❤️ para la comunidad de monitoreo inteligente**
