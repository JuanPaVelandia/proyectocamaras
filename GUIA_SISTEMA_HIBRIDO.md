# Guía: Sistema Híbrido (Backend en Nube + Frigate Local)

## Arquitectura

Este sistema funciona con una arquitectura híbrida:

```
┌─────────────────┐
│  Frontend       │  (Vercel - Nube)
│  (Vercel)       │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  Backend        │  │  Frigate Proxy   │
│  (Railway)      │  │  (Local)         │
│                 │  │                  │
│  - Procesa      │  │  - Obtiene       │
│    eventos      │  │    cámaras       │
│  - Reglas       │  │  - Obtiene       │
│  - Notificaciones│  │    objetos       │
└─────────────────┘  └────────┬─────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Frigate     │
                        │  (Local)     │
                        │              │
                        │  - Detecta   │
                        │    objetos   │
                        │  - Cámaras   │
                        └──────────────┘
```

## Componentes

### 1. Backend en Railway (Nube)
- **Función**: Procesa eventos, gestiona reglas, envía notificaciones
- **URL**: `https://proyectocamaras-production.up.railway.app`
- **No necesita**: Acceso directo a Frigate

### 2. Frigate Proxy Local
- **Función**: Obtiene información de Frigate local (cámaras, objetos)
- **Puerto**: `8001` (por defecto)
- **URL**: `http://localhost:8001`

### 3. Frigate Local
- **Función**: Detecta objetos en las cámaras
- **Puerto**: `5000` (por defecto)
- **URL**: `http://localhost:5000`

## Instalación del Proxy Local

### Paso 1: Instalar dependencias

```bash
cd frigate-proxy
pip install -r requirements.txt
```

### Paso 2: Ejecutar el proxy

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

O manualmente:
```bash
python main.py
```

El proxy estará disponible en `http://localhost:8001`

## Configuración

### Variable de entorno (opcional)

Si Frigate no está en `http://localhost:5000`, puedes configurarlo:

**Windows:**
```cmd
set FRIGATE_HOST=http://tu-ip-frigate:5000
python main.py
```

**Linux/Mac:**
```bash
export FRIGATE_HOST=http://tu-ip-frigate:5000
python main.py
```

## Cómo funciona

1. **Frontend carga opciones de Frigate:**
   - Primero intenta usar el proxy local (`http://localhost:8001`)
   - Si el proxy no está disponible, usa el backend de Railway
   - Esto permite que funcione tanto local como en producción

2. **Backend procesa eventos:**
   - Frigate envía eventos vía MQTT o webhooks al backend en Railway
   - El backend procesa las reglas y envía notificaciones
   - No necesita acceso directo a Frigate

## Ventajas de esta arquitectura

✅ **Backend en nube**: Accesible desde cualquier lugar, no necesitas mantener servidor encendido  
✅ **Frigate local**: Las cámaras y el procesamiento de video quedan en tu red local  
✅ **Flexibilidad**: El frontend puede usar el proxy local cuando esté disponible, o el backend de Railway  
✅ **Seguridad**: Frigate no necesita estar expuesto a internet

## Solución de problemas

### El frontend no puede obtener cámaras

1. Verifica que el proxy local esté corriendo:
   - Abre `http://localhost:8001/health` en tu navegador
   - Deberías ver `{"status": "healthy"}`

2. Verifica que Frigate esté corriendo:
   - Abre `http://localhost:5000` en tu navegador
   - Deberías ver la interfaz de Frigate

3. Verifica la configuración:
   - El proxy intenta conectarse a `http://localhost:5000` por defecto
   - Si Frigate está en otra IP, configura `FRIGATE_HOST`

### El backend muestra errores de conexión a Frigate

Esto es **normal** cuando el backend está en Railway. El backend no puede conectarse a Frigate local, pero esto no afecta su funcionamiento principal (procesar eventos y reglas).

Los errores se muestran como `DEBUG` en los logs, no como errores críticos.

## Próximos pasos

1. Ejecuta el proxy local en tu servidor
2. Asegúrate de que esté corriendo cuando uses el frontend
3. El sistema funcionará automáticamente usando el proxy local cuando esté disponible

