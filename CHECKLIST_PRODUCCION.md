# ✅ Checklist de Despliegue a Producción

## 📋 Pre-requisitos

### Servidor
- [ ] VPS contratado (DigitalOcean, Linode, etc.)
- [ ] Docker instalado en el servidor
- [ ] Docker Compose instalado
- [ ] Acceso SSH al servidor

### Dominio
- [ ] Dominio registrado
- [ ] DNS configurado (A record apuntando a IP del servidor)
- [ ] DNS propagado (verificar con `nslookup` o `dig`)

### Configuración
- [ ] Archivos `.env.production` creados
- [ ] Secretos configurados (JWT, passwords, WhatsApp tokens)
- [ ] CORS_ORIGINS configurado con tu dominio

## 🚀 Despliegue

### Paso 1: Preparar Servidor
- [ ] Conectado por SSH
- [ ] Docker funcionando (`docker ps`)
- [ ] Docker Compose funcionando (`docker compose version`)
- [ ] Firewall configurado (puertos 22, 80, 443)

### Paso 2: Subir Código
- [ ] Código subido al servidor (Git o SCP)
- [ ] Estructura de carpetas correcta
- [ ] Archivos `.env.production` en su lugar

### Paso 3: Configurar SSL
- [ ] Certbot instalado
- [ ] Certificado SSL obtenido
- [ ] Certificados copiados a `nginx/ssl/`
- [ ] Dominio actualizado en `nginx/nginx.conf`

### Paso 4: Construir e Iniciar
- [ ] Imágenes construidas: `docker-compose -f docker-compose.prod.yml build`
- [ ] Servicios iniciados: `docker-compose -f docker-compose.prod.yml up -d`
- [ ] Todos los contenedores corriendo: `docker-compose ps`

### Paso 5: Verificar
- [ ] Frontend accesible: https://tudominio.com
- [ ] Backend API funciona: https://tudominio.com/api/docs
- [ ] Login funciona
- [ ] Crear regla funciona
- [ ] CORS no da errores en consola

## 🔒 Seguridad

- [ ] Contraseñas cambiadas (no las por defecto)
- [ ] JWT_SECRET_KEY fuerte y único
- [ ] Firewall configurado
- [ ] Solo puertos necesarios expuestos
- [ ] Base de datos no expuesta públicamente
- [ ] Archivos `.env` no en el repositorio

## 📦 Backups

- [ ] Script de backup creado
- [ ] Crontab configurado para backups automáticos
- [ ] Backup probado y restaurado exitosamente

## 🔄 Mantenimiento

- [ ] Renovación automática de SSL configurada
- [ ] Logs monitoreados
- [ ] Actualizaciones planificadas

## ✅ Post-Despliegue

- [ ] Documentación actualizada
- [ ] Accesos y credenciales guardados de forma segura
- [ ] Equipo informado de la URL de producción
- [ ] Monitoreo básico configurado (opcional)

## 🎯 URLs Finales

- Frontend: https://tudominio.com
- API: https://tudominio.com/api
- API Docs: https://tudominio.com/api/docs
- Frigate (si se expone): https://tudominio.com/frigate

