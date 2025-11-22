# 🌐 Guía: Cómo Interactuar con el Website

## 📋 Flujo Completo del Usuario

### 1️⃣ **Descarga y Extracción del ZIP**
```
Usuario descarga → Extrae ZIP → Tiene carpeta con todos los archivos
```

### 2️⃣ **Instalación Automática**
El usuario ejecuta `install.ps1` (Windows) o `install.sh` (Linux/Mac)

**¿Qué hace el instalador?**
- ✅ Verifica que Docker esté instalado
- ✅ Crea archivos `.env` con configuraciones por defecto
- ✅ Construye las imágenes Docker (descarga dependencias)
- ✅ Inicia todos los servicios en contenedores Docker

**Servicios que se inician:**
- 🐳 **Mosquitto** (MQTT) - Puerto 1883
- 🐳 **Frigate** (NVR) - Puerto 5000
- 🐳 **PostgreSQL** (Base de datos) - Puerto interno
- 🐳 **Backend** (FastAPI) - Puerto 8000
- 🐳 **Listener** (MQTT → HTTP) - Puerto interno

### 3️⃣ **Iniciar el Frontend (Interfaz Web)**

El frontend **NO está en Docker** en modo desarrollo. El usuario debe iniciarlo manualmente:

#### Opción A: Modo Desarrollo (Recomendado para empezar)

**Windows (PowerShell):**
```powershell
cd Frontend\rules-panel
npm install
npm run dev
```

**Linux/Mac:**
```bash
cd Frontend/rules-panel
npm install
npm run dev
```

**Resultado:**
- El frontend se ejecuta en: **http://localhost:5173**
- Se conecta automáticamente al backend en: **http://localhost:8000**

#### Opción B: Modo Producción (Docker)

Si el usuario quiere ejecutar todo en Docker, debe usar `docker-compose.prod.yml` que incluye el frontend.

### 4️⃣ **Acceder al Website**

1. **Abrir navegador** en: `http://localhost:5173`

2. **Pantalla de Login:**
   - Usuario: `admin`
   - Contraseña: `admin123` (o la configurada en `backend/.env`)

3. **Primera vez:** Se muestra el **Asistente de Configuración** (Onboarding Wizard)

### 5️⃣ **Interacción con el Website**

#### **Pestaña: Cámaras** 📷
- **Ver cámaras:** Lista todas las cámaras configuradas en Frigate
- **Agregar cámara:** Formulario para agregar nueva cámara IP
  - Nombre de la cámara
  - IP, puerto, usuario, contraseña
  - Plantillas para Hikvision/Dahua
- **Eliminar cámara:** Botón para eliminar cámaras

#### **Pestaña: Reglas** ⚙️
- **Ver reglas:** Lista todas las reglas de alerta creadas
- **Crear regla:**
  - Nombre descriptivo
  - Seleccionar cámara (o todas)
  - Seleccionar objetos a detectar (checkboxes con búsqueda)
  - Configurar score mínimo
  - Configurar duración mínima
  - Configurar rango horario (opcional)
  - Mensaje personalizado (opcional)
- **Editar regla:** Clic en "Editar" → Modifica y "Actualizar"
- **Eliminar regla:** Clic en "Eliminar" → Confirmar

#### **Pestaña: Activaciones** 🔔
- Lista todas las veces que se activó una regla
- Muestra: fecha, hora, cámara, objeto detectado, score
- Filtros por fecha y regla

#### **Pestaña: Eventos** 📊
- Lista todos los eventos detectados por Frigate
- Muestra: fecha, hora, cámara, objeto, score
- Filtros por fecha, cámara, objeto

### 6️⃣ **Flujo de Datos (Cómo Funciona)**

```
┌─────────────┐
│   Frigate   │ Detecta objeto → Publica en MQTT
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Mosquitto  │ Broker MQTT
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Listener   │ Escucha MQTT → Envía a Backend API
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Backend   │ Recibe evento → Evalúa reglas → Envía WhatsApp
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Frontend   │ Usuario ve eventos/activaciones en tiempo real
└─────────────┘
```

### 7️⃣ **Configuración Adicional**

#### **Configurar WhatsApp:**
1. Editar `backend/.env`
2. Agregar:
   ```
   WHATSAPP_TOKEN=tu_token_aqui
   WHATSAPP_PHONE_NUMBER_ID=tu_phone_id
   ```
3. Reiniciar backend: `docker-compose restart backend`

#### **Agregar Más Cámaras:**
1. Ir a pestaña "Cámaras" en el website
2. Completar formulario
3. Clic en "Agregar Cámara"
4. Frigate se reinicia automáticamente

#### **Crear Reglas:**
1. Ir a pestaña "Reglas"
2. Completar formulario
3. Clic en "Crear Regla"
4. La regla queda activa inmediatamente

### 8️⃣ **URLs Importantes**

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend** | http://localhost:5173 | Interfaz web principal |
| **Backend API** | http://localhost:8000 | API REST |
| **API Docs** | http://localhost:8000/docs | Documentación Swagger |
| **Frigate UI** | http://localhost:5000 | Interfaz de Frigate (opcional) |

### 9️⃣ **Comandos Útiles**

```powershell
# Ver estado de servicios
docker-compose ps

# Ver logs del backend
docker-compose logs -f backend

# Reiniciar un servicio
docker-compose restart backend

# Detener todo
docker-compose down

# Iniciar todo
docker-compose up -d

# Ver logs del frontend (si está en desarrollo)
# Se ven en la terminal donde ejecutaste npm run dev
```

### 🔟 **Solución de Problemas**

#### **El frontend no carga:**
- Verifica que esté corriendo: `npm run dev` en `Frontend/rules-panel`
- Verifica que el puerto 5173 no esté en uso
- Revisa la consola del navegador (F12) para errores

#### **No se conecta al backend:**
- Verifica que el backend esté corriendo: `docker-compose ps`
- Verifica que el puerto 8000 no esté en uso
- Revisa los logs: `docker-compose logs backend`

#### **No aparecen eventos:**
- Verifica que Frigate esté corriendo: `docker-compose ps frigate`
- Verifica que haya cámaras configuradas
- Verifica que las cámaras estén en línea
- Revisa logs: `docker-compose logs listener`

#### **No recibo alertas de WhatsApp:**
- Verifica configuración en `backend/.env`
- Verifica que el token sea válido
- Revisa logs: `docker-compose logs backend | grep -i whatsapp`

---

## 📝 Resumen del Flujo

1. **Usuario descarga ZIP** → Extrae
2. **Ejecuta instalador** → Todo se configura automáticamente
3. **Inicia frontend** → `npm run dev` en `Frontend/rules-panel`
4. **Abre navegador** → http://localhost:5173
5. **Inicia sesión** → admin / admin123
6. **Sigue asistente** → Configura primera cámara y regla
7. **Usa el website** → Agrega cámaras, crea reglas, ve eventos
8. **Recibe alertas** → WhatsApp cuando se detectan objetos

¡Listo! El usuario ya está usando el sistema completo. 🎉

