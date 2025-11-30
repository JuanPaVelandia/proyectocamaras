# 🔐 Guía de Configuración OAuth (Google y Facebook)

## 📋 Requisitos Previos

Para usar autenticación OAuth, necesitas crear aplicaciones en:
- **Google Cloud Console** (para Google OAuth)
- **Facebook Developers** (para Facebook OAuth)

---

## 🔵 Configurar Google OAuth

### Paso 1: Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google+ API**

### Paso 2: Crear Credenciales OAuth

1. Ve a **APIs & Services** → **Credentials**
2. Clic en **Create Credentials** → **OAuth client ID**
3. Si es la primera vez, configura la **OAuth consent screen**:
   - Tipo: **External**
   - Nombre de la app: "Sistema de Monitoreo"
   - Email de soporte: tu email
   - Guarda y continúa
4. Crea el **OAuth client ID**:
   - Tipo: **Web application**
   - Nombre: "Frigate Monitoring Web"
   - **Authorized redirect URIs**: 
     - `http://localhost:8000/api/auth/google/callback` (desarrollo)
     - `https://tudominio.com/api/auth/google/callback` (producción)
5. Copia el **Client ID** y **Client Secret**

### Paso 3: Configurar en Backend

Edita `backend/.env` y agrega:

```env
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

### Paso 4: Reiniciar Backend

```bash
docker-compose restart backend
```

---

## 🔵 Configurar Facebook OAuth

### Paso 1: Crear App en Facebook Developers

1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Clic en **My Apps** → **Create App**
3. Selecciona **Consumer** como tipo de app
4. Completa el formulario:
   - Nombre de la app: "Sistema de Monitoreo"
   - Email de contacto: tu email
   - Clic en **Create App**

### Paso 2: Configurar Facebook Login

1. En el dashboard de la app, busca **Facebook Login**
2. Clic en **Set Up**
3. Selecciona **Web** como plataforma
4. Configura:
   - **Site URL**: `http://localhost:8000` (desarrollo) o `https://tudominio.com` (producción)
   - Guarda los cambios

### Paso 3: Obtener Credenciales

1. Ve a **Settings** → **Basic**
2. Copia el **App ID** (Client ID)
3. Copia el **App Secret** (Client Secret)
4. En **Facebook Login** → **Settings**, agrega:
   - **Valid OAuth Redirect URIs**: 
     - `http://localhost:8000/api/auth/facebook/callback` (desarrollo)
     - `https://tudominio.com/api/auth/facebook/callback` (producción)

### Paso 4: Configurar en Backend

Edita `backend/.env` y agrega:

```env
FACEBOOK_CLIENT_ID=tu_app_id_aqui
FACEBOOK_CLIENT_SECRET=tu_app_secret_aqui
FACEBOOK_REDIRECT_URI=http://localhost:8000/api/auth/facebook/callback
FRONTEND_URL=http://localhost:5173
```

### Paso 5: Reiniciar Backend

```bash
docker-compose restart backend
```

---

## 🗄️ Migración de Base de Datos

Si ya tienes usuarios en la base de datos, ejecuta la migración:

```bash
cd backend
python migrate_add_oauth_fields.py
```

Esto agregará los campos necesarios para OAuth sin afectar los usuarios existentes.

---

## ✅ Verificar Configuración

### Verificar que OAuth esté configurado:

1. Abre el frontend: http://localhost:5173
2. Ve a la página de login
3. Deberías ver los botones de "Continuar con Google" y "Continuar con Facebook"
4. Si no aparecen, verifica:
   - Que las variables de entorno estén en `backend/.env`
   - Que el backend esté reiniciado
   - Revisa los logs: `docker-compose logs backend`

### Probar OAuth:

1. Clic en "Continuar con Google" o "Continuar con Facebook"
2. Serás redirigido al proveedor para autorizar
3. Después de autorizar, serás redirigido de vuelta al sistema
4. Se creará automáticamente tu cuenta si no existe

---

## 🔧 Solución de Problemas

### Error: "OAuth no está configurado"

- Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén en `backend/.env`
- Reinicia el backend: `docker-compose restart backend`

### Error: "Redirect URI mismatch"

- Verifica que la URI de redirección en Google Cloud Console coincida exactamente con `GOOGLE_REDIRECT_URI`
- Debe ser exactamente igual (incluyendo http/https, puerto, etc.)

### Error: "Invalid client"

- Verifica que el Client ID y Client Secret sean correctos
- Asegúrate de que no haya espacios extra al copiar/pegar

### Los botones de OAuth no aparecen

- Verifica que las credenciales estén configuradas
- Revisa la consola del navegador para errores
- Verifica los logs del backend

---

## 📝 Notas Importantes

1. **Desarrollo vs Producción:**
   - En desarrollo, usa `http://localhost:8000`
   - En producción, usa `https://tudominio.com`
   - Actualiza las URIs de redirección en ambos proveedores

2. **Seguridad:**
   - Nunca compartas tus Client Secrets
   - No subas `.env` a repositorios públicos
   - Usa variables de entorno en producción

3. **Usuarios OAuth:**
   - Los usuarios OAuth no tienen contraseña
   - Se identifican por `oauth_provider` + `oauth_id`
   - Pueden tener email, nombre y avatar

---

## 🎉 ¡Listo!

Una vez configurado, los usuarios podrán:
- Registrarse con Google o Facebook
- Iniciar sesión con un solo clic
- No necesitar crear contraseñas

El sistema creará automáticamente la cuenta la primera vez que se autentiquen.

