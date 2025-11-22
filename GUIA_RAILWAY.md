# 🚂 Guía para Publicar el Backend en Railway

## Prerrequisitos

1. **Cuenta de Railway**: Crea una cuenta gratuita en https://railway.app
2. **GitHub conectado**: Conecta tu cuenta de GitHub a Railway
3. **Repositorio en GitHub**: Tu código debe estar en GitHub (ya lo tienes: https://github.com/JuanPaVelandia/frigate)

## Pasos para Publicar el Backend

### Paso 1: Crear Proyecto en Railway

1. **Inicia sesión en Railway**
   - Ve a https://railway.app
   - Inicia sesión con tu cuenta de GitHub

2. **Crear Nuevo Proyecto**
   - Haz clic en "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Selecciona tu repositorio `frigate` (o el que tengas)
   - Railway detectará automáticamente que es un proyecto Python

### Paso 2: Configurar el Servicio Backend

1. **Agregar Servicio**
   - Railway debería detectar automáticamente el backend
   - Si no, haz clic en "+ New" → "GitHub Repo"
   - Selecciona el repositorio y la rama `main`

2. **Configurar Root Directory**
   - En Settings → Service Settings
   - Root Directory: `backend`
   - Esto le dice a Railway dónde está el código del backend

3. **Configurar Build Settings**
   - Railway debería detectar automáticamente que es Python
   - Build Command: (dejar vacío, Railway lo detecta automáticamente)
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Paso 3: Agregar Base de Datos PostgreSQL

1. **Agregar PostgreSQL**
   - En tu proyecto, haz clic en "+ New" → "Database" → "Add PostgreSQL"
   - Railway creará una base de datos PostgreSQL automáticamente

2. **Obtener la URL de la Base de Datos**
   - Haz clic en la base de datos PostgreSQL
   - Ve a la pestaña "Variables"
   - Copia la variable `DATABASE_URL` (Railway la crea automáticamente)

### Paso 4: Configurar Variables de Entorno

1. **Ve a Settings → Variables** del servicio backend

2. **Agrega las siguientes variables:**

   | Variable | Descripción | Ejemplo |
   |----------|-------------|---------|
   | `DATABASE_URL` | URL de PostgreSQL (Railway la crea automáticamente) | `postgresql://postgres:password@host:5432/railway` |
   | `JWT_SECRET_KEY` | Clave secreta para JWT (genera una aleatoria) | `tu-clave-secreta-super-segura-$(openssl rand -hex 32)` |
   | `ADMIN_USERNAME` | Usuario admin | `admin` |
   | `ADMIN_PASSWORD` | Contraseña admin | `admin123` (cambia esto) |
   | `WHATSAPP_TOKEN` | Token de WhatsApp Business API | (tu token) |
   | `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID de WhatsApp | (tu phone ID) |
   | `CORS_ORIGINS` | Orígenes permitidos (URL de Vercel) | `https://proyectocamaras.vercel.app` |

3. **Generar JWT_SECRET_KEY:**
   ```bash
   # En PowerShell:
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
   
   # O usa un generador online: https://randomkeygen.com/
   ```

### Paso 5: Desplegar

1. **Railway desplegará automáticamente** cuando detecte cambios en GitHub
2. **O haz clic en "Deploy"** manualmente
3. **Espera a que termine el build** (2-5 minutos la primera vez)

### Paso 6: Obtener la URL del Backend

1. **Ve a Settings → Networking** del servicio backend
2. **Haz clic en "Generate Domain"** o usa el dominio automático
3. **Copia la URL** (ej: `https://tu-backend.up.railway.app`)
4. **Esta es la URL que usarás en Vercel como `VITE_API_URL`**

### Paso 7: Configurar Vercel con la URL de Railway

1. **Ve a Vercel** → Tu proyecto → Settings → Environment Variables
2. **Agrega o actualiza:**
   - Name: `VITE_API_URL`
   - Value: `https://tu-backend.up.railway.app` (la URL de Railway)
3. **Guarda y haz Redeploy**

## Verificación

### Verificar que el Backend Funciona

1. **Visita la URL de Railway** + `/docs`
   - Ejemplo: `https://tu-backend.up.railway.app/docs`
   - Deberías ver la documentación de la API (Swagger UI)

2. **Prueba el endpoint de health:**
   - `https://tu-backend.up.railway.app/api/health` (si existe)
   - O cualquier endpoint público

### Verificar la Conexión desde Vercel

1. **Abre la consola del navegador** (F12) en tu sitio de Vercel
2. **Intenta hacer login**
3. **Revisa si hay errores de CORS o conexión**

## Solución de Problemas

### Error: "Database connection failed"
- Verifica que `DATABASE_URL` esté configurada correctamente
- Asegúrate de que la base de datos PostgreSQL esté corriendo en Railway
- Revisa los logs del backend en Railway

### Error: "Module not found"
- Verifica que `requirements.txt` tenga todas las dependencias
- Revisa los logs de build en Railway

### Error: CORS en el frontend
- Verifica que `CORS_ORIGINS` incluya tu dominio de Vercel
- Asegúrate de que el backend esté usando la última versión del código (con el CORS actualizado)

### El backend no inicia
- Revisa los logs en Railway (Deployments → selecciona un deploy → View Logs)
- Verifica que el comando de inicio sea correcto
- Asegúrate de que el puerto sea `$PORT` (Railway lo asigna automáticamente)

## Actualizaciones Futuras

Cada vez que hagas push a GitHub:
- Railway detectará los cambios automáticamente
- Creará un nuevo deploy
- El backend se actualizará automáticamente

## Costos

- **Railway Plan Gratuito**: 
  - $5 de crédito gratis al mes
  - Suficiente para desarrollo y pruebas pequeñas
  - Después de eso, pay-as-you-go

## URLs Útiles

- **Dashboard de Railway**: https://railway.app/dashboard
- **Documentación de Railway**: https://docs.railway.app
- **Documentación de Railway Python**: https://docs.railway.app/guides/python

