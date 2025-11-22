# 🚀 Guía para Publicar en Vercel

## Prerrequisitos

1. **Cuenta de Vercel**: Crea una cuenta gratuita en https://vercel.com
2. **Repositorio en GitHub**: Tu código debe estar en GitHub (ya lo tienes: https://github.com/JuanPaVelandia/frigate)

## Pasos para Publicar

### Opción 1: Desde la Interfaz Web de Vercel (Recomendado)

1. **Inicia sesión en Vercel**
   - Ve a https://vercel.com
   - Inicia sesión con tu cuenta de GitHub

2. **Importar Proyecto**
   - Haz clic en "Add New..." → "Project"
   - Selecciona el repositorio `frigate` (o el que tengas)
   - Si no aparece, haz clic en "Adjust GitHub App Permissions" y autoriza el acceso

3. **Configurar el Proyecto**
   - **Framework Preset**: Vite (debería detectarse automáticamente)
   - **Root Directory**: Si tu frontend está en una subcarpeta, selecciona `Frontend/rules-panel`
   - **Build Command**: `npm run build` (debería estar automático)
   - **Output Directory**: `dist` (debería estar automático)
   - **Install Command**: `npm install` (debería estar automático)

4. **Configurar Variables de Entorno**
   - En la sección "Environment Variables", agrega:
     - **Nombre**: `VITE_API_URL`
     - **Valor**: La URL de tu backend (ej: `https://tu-backend.vercel.app` o `http://tu-servidor:8000`)
   - ⚠️ **Importante**: Si tu backend está en otro servidor, usa esa URL completa

5. **Desplegar**
   - Haz clic en "Deploy"
   - Espera a que termine el build (2-5 minutos)
   - ¡Listo! Tu frontend estará disponible en una URL como `https://tu-proyecto.vercel.app`

### Opción 2: Desde la Terminal (CLI de Vercel)

1. **Instalar Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Iniciar sesión**
   ```bash
   vercel login
   ```

3. **Navegar al directorio del frontend**
   ```bash
   cd Frontend/rules-panel
   ```

4. **Desplegar**
   ```bash
   vercel
   ```
   - Sigue las instrucciones interactivas
   - Cuando pregunte por variables de entorno, agrega `VITE_API_URL`

5. **Para producción**
   ```bash
   vercel --prod
   ```

## Configuración de Variables de Entorno

### Variables Necesarias

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL del backend API | `https://api.tudominio.com` o `http://tu-ip:8000` |

### Cómo Agregar Variables en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega cada variable:
   - **Name**: `VITE_API_URL`
   - **Value**: Tu URL del backend
   - **Environment**: Production, Preview, Development (marca todas)
4. Haz clic en "Save"
5. **Importante**: Después de agregar variables, necesitas hacer un nuevo deploy

## Configuración del Backend

⚠️ **Nota Importante**: Vercel está optimizado para frontends. Para el backend FastAPI, tienes varias opciones:

### Opción A: Backend en Vercel (Serverless Functions)
- Vercel puede ejecutar funciones serverless de Python
- Requiere adaptar el backend para usar funciones serverless
- Más complejo pero escalable

### Opción B: Backend en otro servicio (Recomendado)
- **Railway**: https://railway.app (gratis para empezar)
- **Render**: https://render.com (gratis con limitaciones)
- **DigitalOcean App Platform**: https://www.digitalocean.com/products/app-platform
- **Tu propio servidor**: Si tienes un servidor, puedes hostear el backend allí

### Opción C: Backend en el mismo servidor
- Si ya tienes un servidor corriendo Docker, el backend puede quedarse allí
- Solo necesitas configurar `VITE_API_URL` para apuntar a tu servidor

## Verificación Post-Deploy

1. **Visita tu URL de Vercel**: `https://tu-proyecto.vercel.app`
2. **Verifica que el frontend carga correctamente**
3. **Prueba hacer login** (debe conectarse al backend)
4. **Revisa la consola del navegador** (F12) para ver si hay errores de conexión

## Solución de Problemas

### Error: "Failed to fetch" o CORS
- Verifica que `VITE_API_URL` esté configurada correctamente
- Asegúrate de que el backend tenga CORS configurado para aceptar tu dominio de Vercel
- Revisa los logs del backend

### Error: "Module not found"
- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que `node_modules` no esté en `.gitignore` (no debería estar)

### El frontend carga pero no se conecta al backend
- Verifica la variable `VITE_API_URL` en Vercel
- Asegúrate de que el backend esté accesible públicamente
- Revisa los logs de Vercel (Deployments → selecciona un deploy → View Function Logs)

### Build falla
- Revisa los logs de build en Vercel
- Verifica que todas las dependencias estén instaladas
- Asegúrate de que no haya errores de sintaxis en el código

## Actualizaciones Futuras

Cada vez que hagas push a GitHub:
- Vercel detectará los cambios automáticamente
- Creará un nuevo deploy de preview
- Si está en la rama `main`, desplegará a producción automáticamente

## URLs Útiles

- **Dashboard de Vercel**: https://vercel.com/dashboard
- **Documentación de Vercel**: https://vercel.com/docs
- **Documentación de Vite en Vercel**: https://vercel.com/docs/frameworks/vite

