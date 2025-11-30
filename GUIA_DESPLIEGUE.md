# 📦 Guía Completa de Despliegue a Producción

## 🎯 Resumen: Lo que falta

### ✅ Ya tienes
- Backend funcionando
- Base de datos configurada
- Docker Compose
- Frontend funcional

### ❌ Lo que falta implementar

1. **Servidor Web (Nginx)** - Para servir el frontend y SSL
2. **Dockerfile del Frontend** - Para compilar y servir React
3. **Configuración de CORS** - Para permitir tu dominio
4. **SSL/HTTPS** - Certificado Let's Encrypt
5. **Variables de entorno de producción**
6. **Configuración de dominio y DNS**

## 🚀 Pasos para Desplegar

### Paso 1: Preparar el Servidor

```bash
# 1. Conectar a tu servidor VPS
ssh usuario@tu-servidor.com

# 2. Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Instalar Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 4. Reiniciar sesión para aplicar cambios
exit
ssh usuario@tu-servidor.com
```

### Paso 2: Subir el Código

```bash
# Opción A: Git (recomendado)
git clone tu-repositorio
cd frigate

# Opción B: SCP
scp -r . usuario@servidor:/ruta/destino
```

### Paso 3: Configurar Variables de Entorno

```bash
# Crear archivos .env de producción
cp backend/.env.example backend/.env.production
cp python-listener/.env.example python-listener/.env.production

# Editar con tus valores reales
nano backend/.env.production
```

**backend/.env.production:**
```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD_SEGURO@db:5432/frigate_events
JWT_SECRET_KEY=TU_SECRET_KEY_MUY_SEGURO_AQUI
ADMIN_USERNAME=admin
ADMIN_PASSWORD=TU_PASSWORD_ADMIN_SEGURO
WHATSAPP_TOKEN=tu-token-real
WHATSAPP_PHONE_NUMBER_ID=tu-phone-id-real
CORS_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

### Paso 4: Configurar Dominio y DNS

1. **Registrar dominio** (si no tienes)
2. **Configurar DNS**:
   - Tipo A: `@` → IP de tu servidor
   - Tipo A: `www` → IP de tu servidor
   - (Opcional) Tipo A: `api` → IP de tu servidor

### Paso 5: Configurar SSL

```bash
# 1. Detener Nginx temporalmente
docker-compose -f docker-compose.prod.yml down nginx

# 2. Ejecutar script de SSL
chmod +x setup_ssl.sh
./setup_ssl.sh tudominio.com tu-email@ejemplo.com

# 3. Actualizar nginx.conf con tu dominio
nano nginx/nginx.conf
# Cambiar: server_name _; por server_name tudominio.com;
```

### Paso 6: Actualizar Frontend para Producción

```javascript
// En Frontend/rules-panel/src/services/api.js
// Cambiar de:
const API_BASE = "http://localhost:8000";
// A:
const API_BASE = process.env.VITE_API_URL || "https://tudominio.com/api";
```

Crear `.env.production` en el frontend:
```env
VITE_API_URL=https://tudominio.com/api
```

### Paso 7: Construir e Iniciar

```bash
# Construir todas las imágenes
docker-compose -f docker-compose.prod.yml build

# Iniciar servicios
docker-compose -f docker-compose.prod.yml up -d

# Verificar que todo esté corriendo
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Paso 8: Verificar

1. Abre https://tudominio.com
2. Verifica que el frontend carga
3. Prueba iniciar sesión
4. Verifica que las APIs funcionan

## 🔒 Seguridad Adicional

### Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Renovar Certificado SSL

```bash
# Agregar a crontab para renovación automática
sudo crontab -e
# Agregar:
0 3 * * * certbot renew --quiet && docker-compose -f /ruta/frigate/docker-compose.prod.yml restart nginx
```

### Backups de Base de Datos

```bash
# Crear script de backup
cat > backup_db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec frigate_db pg_dump -U postgres frigate_events > backups/db_backup_$DATE.sql
# Mantener solo últimos 7 días
find backups/ -name "db_backup_*.sql" -mtime +7 -delete
EOF

chmod +x backup_db.sh

# Agregar a crontab (diario a las 2 AM)
0 2 * * * /ruta/frigate/backup_db.sh
```

## 📊 Monitoreo

### Verificar Estado

```bash
# Estado de contenedores
docker-compose -f docker-compose.prod.yml ps

# Uso de recursos
docker stats

# Logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f
```

### Health Checks

```bash
# Backend
curl https://tudominio.com/api/health

# Frontend
curl -I https://tudominio.com
```

## 🐛 Solución de Problemas

### El frontend no carga
- Verifica que el contenedor `frigate_frontend` esté corriendo
- Revisa logs: `docker logs frigate_frontend`
- Verifica que Nginx esté proxyando correctamente

### Error de CORS
- Verifica `CORS_ORIGINS` en `.env.production`
- Asegúrate de incluir `https://` en las URLs
- Reinicia el backend después de cambiar CORS

### SSL no funciona
- Verifica que los certificados estén en `nginx/ssl/`
- Revisa permisos: `ls -la nginx/ssl/`
- Verifica logs de Nginx: `docker logs frigate_nginx`

### Base de datos no conecta
- Verifica `DATABASE_URL` en `.env.production`
- Asegúrate de que el contenedor `db` esté corriendo
- Revisa logs: `docker logs frigate_db`

## 📝 Checklist Final

- [ ] Servidor VPS configurado
- [ ] Docker y Docker Compose instalados
- [ ] Código subido al servidor
- [ ] Variables de entorno configuradas
- [ ] Dominio configurado y DNS apuntando
- [ ] Certificado SSL obtenido
- [ ] Nginx configurado con SSL
- [ ] Frontend compilado y funcionando
- [ ] CORS configurado correctamente
- [ ] Firewall configurado
- [ ] Backups automáticos configurados
- [ ] Renovación automática de SSL configurada
- [ ] Todo funcionando en https://tudominio.com

## 🎉 ¡Listo!

Tu sistema debería estar funcionando en producción. Si tienes problemas, revisa los logs y la sección de solución de problemas.

