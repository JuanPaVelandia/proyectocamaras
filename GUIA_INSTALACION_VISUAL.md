# 📸 Guía Visual de Instalación

## Paso 1: Instalar Docker Desktop

### Windows:
1. Descarga Docker Desktop desde: https://www.docker.com/products/docker-desktop/
2. Ejecuta el instalador
3. **IMPORTANTE**: Reinicia tu computadora después de instalar
4. Abre Docker Desktop y espera a que esté listo (ícono de ballena en la bandeja)

### Verificar instalación:
Abre PowerShell y ejecuta:
```powershell
docker --version
```
Deberías ver algo como: `Docker version 24.x.x`

---

## Paso 2: Descargar el Sistema

### Opción A: Desde ZIP (Recomendado)
1. Descarga el archivo `frigate-monitoring-v1.0.zip`
2. Extrae el contenido en una carpeta (ej: `C:\frigate-monitoring`)
3. Abre PowerShell en esa carpeta

### Opción B: Desde Git
```powershell
git clone <tu-repositorio>
cd frigate-monitoring
```

---

## Paso 3: Ejecutar Instalador

### Windows:
```powershell
.\install.ps1
```

### Linux/Mac:
```bash
chmod +x install.sh
./install.sh
```

### ¿Qué hace el instalador?
1. ✅ Verifica que Docker esté instalado
2. ✅ Crea archivos de configuración (.env)
3. ✅ Construye las imágenes Docker
4. ✅ Inicia todos los servicios
5. ✅ Verifica que todo esté funcionando

**Tiempo estimado**: 5-15 minutos (depende de tu conexión a internet)

---

## Paso 4: Acceder al Sistema

1. Abre tu navegador
2. Ve a: **http://localhost:5173**
3. Inicia sesión con:
   - Usuario: `admin`
   - Contraseña: `admin123` (o la que configuraste)

---

## Paso 5: Asistente de Configuración

Al iniciar sesión por primera vez, verás un asistente que te guiará:

### Paso 1: Bienvenida
- Información sobre el sistema
- Clic en "Comenzar Configuración"

### Paso 2: Agregar Cámara
- Nombre de la cámara (ej: `cam_entrada`)
- IP de la cámara (ej: `192.168.1.100`)
- Usuario y contraseña (si la cámara los requiere)
- Clic en "Agregar Cámara"

### Paso 3: Configurar WhatsApp (Opcional)
- Token de WhatsApp Business API
- Phone Number ID
- Número de teléfono
- Puedes saltar este paso y configurarlo después

### Paso 4: Crear Primera Regla
- Nombre de la regla (ej: "Persona en Entrada")
- Seleccionar cámara
- Seleccionar objeto a detectar (Persona, Automóvil, etc.)
- Score mínimo (0.7 recomendado)
- Clic en "Crear Regla"

### Paso 5: ¡Listo!
- Sistema configurado
- Clic en "Ir al Panel Principal"

---

## Paso 6: Usar el Sistema

### Agregar Más Cámaras
1. Ve a la pestaña **"Cámaras"**
2. Completa el formulario
3. Usa las plantillas si tienes Hikvision o Dahua
4. Clic en "Agregar Cámara"

### Crear Reglas
1. Ve a la pestaña **"Reglas"**
2. Completa el formulario:
   - Nombre descriptivo
   - Selecciona cámara (o deja vacío para todas)
   - Selecciona objetos (puedes elegir varios)
   - Configura score y duración mínima
   - Opcional: Rango horario y mensaje personalizado
3. Clic en "Crear Regla"

### Ver Eventos
- **Activaciones**: Cuándo se activaron las reglas
- **Eventos**: Todos los eventos detectados por Frigate

---

## 🔧 Solución de Problemas

### Docker no inicia
- Verifica que Docker Desktop esté corriendo
- Reinicia Docker Desktop
- Reinicia tu computadora

### Los servicios no inician
```powershell
docker-compose logs
```
Revisa los errores en los logs

### No puedo agregar cámaras
- Verifica que la IP de la cámara sea correcta
- Verifica que la cámara esté en la misma red
- Prueba acceder a la cámara desde VLC u otro reproductor RTSP

### No recibo alertas de WhatsApp
- Verifica que `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` estén en `backend/.env`
- Verifica que el número de teléfono esté en formato internacional (+52...)
- Revisa los logs: `docker-compose logs backend | grep -i whatsapp`

---

## 📞 Comandos Útiles

```powershell
# Ver estado de servicios
docker-compose ps

# Ver logs
docker-compose logs -f

# Reiniciar un servicio
docker-compose restart backend

# Detener todo
docker-compose down

# Iniciar todo
docker-compose up -d
```

---

## ✅ Checklist de Instalación

- [ ] Docker Desktop instalado y corriendo
- [ ] Sistema descargado y extraído
- [ ] Instalador ejecutado exitosamente
- [ ] Todos los servicios corriendo (verificar con `docker-compose ps`)
- [ ] Acceso al frontend: http://localhost:5173
- [ ] Login exitoso
- [ ] Asistente de configuración completado
- [ ] Al menos una cámara agregada
- [ ] Al menos una regla creada
- [ ] Sistema funcionando correctamente

---

## 🎉 ¡Felicidades!

Tu sistema de monitoreo está listo para usar. Ahora puedes:
- Agregar más cámaras
- Crear reglas personalizadas
- Recibir alertas por WhatsApp
- Ver eventos y activaciones

