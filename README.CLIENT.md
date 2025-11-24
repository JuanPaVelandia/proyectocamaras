# 🎥 Instalación Cliente - Frigate Local con Backend Centralizado

Esta guía es para usuarios que quieren instalar **solo Frigate localmente** y conectarse a un **backend centralizado en la nube**.

## ✨ ¿Qué Incluye Esta Instalación?

✅ **Frigate NVR** - Procesa tus cámaras localmente con IA
✅ **Mosquitto MQTT** - Comunicación interna
✅ **Listener** - Envía eventos al backend centralizado

❌ **NO incluye:**
- Backend propio (usas el centralizado)
- Base de datos local (todo está en la nube)
- Panel web local (accedes al centralizado)

---

## 🚀 Instalación Rápida (3 minutos)

### Requisitos

- **Docker** instalado
  - Windows: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - Linux: `sudo apt install docker.io docker-compose`
  - Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

- **Cámara IP con RTSP** (puedes configurarla después)

### Paso 1: Descargar el Proyecto

```bash
git clone https://github.com/JuanPaVelandia/proyectocamaras.git
cd proyectocamaras
```

O descarga el ZIP desde: https://github.com/JuanPaVelandia/proyectocamaras/archive/refs/heads/main.zip

### Paso 2: Iniciar Frigate

```bash
docker-compose -f docker-compose.client.yml up -d
```

Esto iniciará:
- ✅ Mosquitto (MQTT Broker)
- ✅ Frigate (Detección IA)
- ✅ Listener (Envía eventos al backend)

Espera ~2 minutos mientras descarga las imágenes.

### Paso 3: Acceder a Frigate

1. **Abre Frigate:** http://localhost:5000
2. **Login:** Usuario `admin` + contraseña generada (ver logs)

### Paso 4: Crear tu Cuenta en el Panel Web

1. **Ve al panel web centralizado:** https://tu-panel-web.vercel.app
2. **Registrarte:**
   - Username
   - Email
   - Contraseña
   - Selecciona tu país 🇨🇴
   - Ingresa tu WhatsApp: `+57 311 226 4829`
   - ✅ Activa: "Recibir alertas por WhatsApp"
3. **Crear Cuenta**

### Paso 5: Registrar tu Cámara en el Panel Web

⚠️ **IMPORTANTE: Primero regístrala en el panel web, luego configúrala en Frigate**

1. **Ve al panel web:** https://tu-panel-web.vercel.app
2. **Pestaña "Cámaras"** → **"+ Nueva Cámara"**
3. Registra tu cámara:
   - **Nombre:** `cam_recibo` (recuerda este nombre exacto)
   - **Descripción:** "Cámara del recibo"
4. **Crear Cámara**

### Paso 6: Configurar la Cámara en Frigate

⚠️ **El nombre DEBE ser EXACTAMENTE igual al registrado en el panel web**

1. **En Frigate** (http://localhost:5000):
   - Ve a **Settings → Config Editor**

2. **Agrega tu cámara con el MISMO nombre:**

```yaml
cameras:
  cam_recibo:  # ⚠️ Debe coincidir EXACTAMENTE con el panel web
    enabled: true
    ffmpeg:
      inputs:
        - path: rtsp://usuario:password@192.168.1.100:554/stream1
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
        - dog
        - cat
```

3. **Guarda** y **reinicia Frigate:**

```bash
docker-compose -f docker-compose.client.yml restart frigate
```

### Paso 7: Crear Reglas desde el Panel Web

1. **Ve al panel web** donde creaste tu cuenta
2. **Pestaña "Reglas"** → **"+ Nueva Regla"**
3. Configura:
   - **Nombre:** "Persona en la entrada"
   - **Cámara:** `cam_recibo` (selecciona de la lista)
   - **Objetos:** `person`
   - **Score mínimo:** `0.7`
4. **Crear Regla**

¡Listo! Cuando Frigate detecte algo, recibirás WhatsApp con imagen.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│   TU COMPUTADORA (Local)                │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │         FRIGATE                   │  │
│  │   http://localhost:5000           │  │
│  │  • Procesa tus cámaras            │  │
│  │  • Detección con IA               │  │
│  └────────────┬─────────────────────┘  │
│               │ MQTT                    │
│  ┌────────────▼─────────────────────┐  │
│  │         LISTENER                  │  │
│  │  • Escucha eventos                │  │
│  │  • Envía a backend centralizado   │  │
│  └────────────┬─────────────────────┘  │
└───────────────┼─────────────────────────┘
                │ HTTPS
┌───────────────▼─────────────────────────┐
│   BACKEND CENTRALIZADO (Railway)        │
│   https://proyectocamaras.railway.app   │
│  • Motor de Reglas                      │
│  • Base de datos compartida             │
│  • Envío de WhatsApp                    │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│   PANEL WEB (Vercel)                    │
│   https://tu-panel.vercel.app           │
│  • Gestión de reglas                    │
│  • Configuración de perfil              │
│  • Historial de eventos                 │
└─────────────────────────────────────────┘
```

---

## 📷 URLs RTSP Comunes por Fabricante

### Hikvision
```
rtsp://user:pass@192.168.1.100:554/Streaming/Channels/101
rtsp://user:pass@192.168.1.100:554/Streaming/Channels/102  # Stream secundario
```

### Dahua
```
rtsp://user:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0
rtsp://user:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=1  # Sub-stream
```

### TP-Link (Tapo, Kasa)
```
rtsp://user:pass@192.168.1.100:554/stream1
rtsp://user:pass@192.168.1.100:554/stream2
```

### Reolink
```
rtsp://user:pass@192.168.1.100:554/h264Preview_01_main
rtsp://user:pass@192.168.1.100:554/h264Preview_01_sub
```

### Xiaomi (Mi Home)
```
rtsp://user:pass@192.168.1.100:554/live/ch00_0
```

### Genérico ONVIF
```
rtsp://user:pass@192.168.1.100:554/stream1
rtsp://user:pass@192.168.1.100:554/stream2
```

**Verificar con VLC:**
```bash
vlc rtsp://usuario:password@192.168.1.100:554/stream1
```

---

## 🛠️ Comandos Útiles

### Ver Logs

```bash
# Todos los servicios
docker-compose -f docker-compose.client.yml logs -f

# Solo Frigate
docker-compose -f docker-compose.client.yml logs -f frigate

# Solo Listener
docker-compose -f docker-compose.client.yml logs -f listener
```

### Reiniciar Servicios

```bash
# Reiniciar todo
docker-compose -f docker-compose.client.yml restart

# Solo Frigate
docker-compose -f docker-compose.client.yml restart frigate
```

### Detener Sistema

```bash
docker-compose -f docker-compose.client.yml down
```

### Ver Estado

```bash
docker-compose -f docker-compose.client.yml ps
```

---

## 🐛 Solución de Problemas

### Frigate no detecta objetos

**Problema:** Las cámaras se ven pero no detecta nada.

**Solución:**
1. Verifica que `detect` esté habilitado en `config/config.yml`:
   ```yaml
   detect:
     enabled: true
     fps: 5
   ```
2. Verifica los objetos a trackear:
   ```yaml
   objects:
     track:
       - person
       - car
   ```

### No llegan eventos al backend

**Problema:** Frigate detecta pero no llegan eventos.

**Solución:**
1. Ver logs del listener:
   ```bash
   docker-compose -f docker-compose.client.yml logs listener
   ```

2. Verifica la URL del backend en `docker-compose.client.yml`:
   ```yaml
   environment:
     - CLOUD_API_URL=https://proyectocamaras-production.up.railway.app/api/events/
   ```

3. Verifica que el backend esté accesible:
   ```bash
   curl https://proyectocamaras-production.up.railway.app/health
   ```

### Eventos no aparecen en el panel web

**Problema:** Frigate detecta objetos pero no aparecen eventos en el panel web.

**Causa más común:** El nombre de la cámara en Frigate NO coincide con el nombre registrado en el panel web.

**Solución:**
1. **Verifica el nombre en el panel web:**
   - Ve a "Cámaras" en el panel web
   - Anota el nombre exacto (ej: `cam_recibo`)

2. **Verifica el nombre en Frigate:**
   - Abre http://localhost:5000
   - Ve a Settings → Config Editor
   - Busca la sección `cameras:`
   - El nombre debe ser **EXACTAMENTE** igual

3. **Si los nombres NO coinciden:**
   - Edita `config.yml` en Frigate
   - Cambia el nombre de la cámara al correcto
   - Guarda y reinicia:
     ```bash
     docker-compose -f docker-compose.client.yml restart frigate
     ```

4. **Verifica que lleguen eventos nuevos:**
   ```bash
   docker-compose -f docker-compose.client.yml logs -f listener
   ```
   - Debes ver: `camera=cam_recibo` (el nombre correcto)

### No llegan alertas de WhatsApp

**Problema:** Los eventos llegan al backend pero no recibes WhatsApp.

**Solución:**
1. Verifica tu perfil en el panel web:
   - Número en formato internacional: `+573112264829`
   - Notificaciones activadas: ✅

2. Verifica que tengas reglas activas:
   - Ve a "Reglas" en el panel web
   - Asegúrate de que la cámara coincida con el nombre en Frigate

3. Verifica que el nombre de la cámara sea correcto:
   - En Frigate: `cam_recibo`
   - En la regla: `cam_recibo` (debe coincidir exactamente)

### Cámara no se conecta

**Problema:** "Camera not found" o stream falla.

**Solución:**
1. Verifica la URL con VLC:
   ```bash
   vlc rtsp://user:pass@ip:554/stream1
   ```

2. Verifica usuario y contraseña de la cámara

3. Asegúrate de que la cámara permita múltiples conexiones RTSP

4. Prueba con ffmpeg:
   ```bash
   ffmpeg -i rtsp://user:pass@ip:554/stream1 -frames:v 1 test.jpg
   ```

---

## 🔐 Seguridad

### Recomendaciones

1. **Cambiar contraseña de Frigate:**
   - Accede a http://localhost:5000
   - Settings → Cambia la contraseña por defecto

2. **No expongas Frigate a internet:**
   - Frigate debe quedarse en tu red local
   - Solo el listener se comunica con el backend

3. **Usa contraseñas fuertes en tus cámaras:**
   - Evita contraseñas por defecto
   - Usa combinaciones de letras, números y símbolos

---

## 📊 Ventajas de Este Setup

✅ **No necesitas servidor propio:**
- Backend centralizado en Railway (gratis)
- Base de datos compartida
- Panel web en Vercel

✅ **Privacidad:**
- Tus videos nunca salen de tu red local
- Solo se envían eventos (texto + snapshot)
- Frigate procesa todo localmente

✅ **Fácil de mantener:**
- Actualizaciones solo en el backend centralizado
- No necesitas mantener base de datos
- Todo funciona automáticamente

✅ **Multi-dispositivo:**
- Accede al panel desde cualquier lugar
- Recibe WhatsApp en tu celular
- Múltiples ubicaciones pueden usar el mismo backend

---

## 🌐 URLs Importantes

- **Panel Web:** https://tu-panel.vercel.app
- **Backend API:** https://proyectocamaras-production.up.railway.app
- **Frigate Local:** http://localhost:5000
- **Soporte:** [GitHub Issues](https://github.com/JuanPaVelandia/proyectocamaras/issues)

---

## 📞 Soporte

¿Problemas? ¿Preguntas?

1. Revisa esta guía completa
2. Consulta los logs: `docker-compose -f docker-compose.client.yml logs`
3. Abre un issue en GitHub
4. Documentación de Frigate: https://docs.frigate.video/

---

## 🎉 ¡Listo!

Si seguiste todos los pasos, deberías tener:

- ✅ Frigate detectando objetos localmente
- ✅ Eventos llegando al backend centralizado
- ✅ Alertas de WhatsApp con imágenes
- ✅ Acceso al panel web desde cualquier lugar

---

**¡Disfruta tu sistema de monitoreo inteligente!** 🚀
