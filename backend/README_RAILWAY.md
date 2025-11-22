# 🚂 Backend en Railway - Configuración Rápida

## Variables de Entorno Requeridas

Configura estas variables en Railway (Settings → Variables):

### Obligatorias:
- `DATABASE_URL` - Railway la crea automáticamente cuando agregas PostgreSQL
- `JWT_SECRET_KEY` - Genera una clave aleatoria (ej: usa un generador online)
- `ADMIN_USERNAME` - Usuario admin (ej: `admin`)
- `ADMIN_PASSWORD` - Contraseña admin (cambia la predeterminada)

### Opcionales:
- `WHATSAPP_TOKEN` - Token de WhatsApp Business API
- `WHATSAPP_PHONE_NUMBER_ID` - Phone Number ID de WhatsApp
- `CORS_ORIGINS` - Orígenes permitidos (ej: `https://proyectocamaras.vercel.app`)

## Comandos

- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Root Directory**: `backend`

## Notas

- Railway asigna el puerto automáticamente usando `$PORT`
- La base de datos PostgreSQL se crea automáticamente
- El backend se despliega automáticamente cuando haces push a GitHub

