# 📦 Instrucciones para Usar el ZIP

## ✅ SÍ, el ZIP debería funcionar en otro computador

El ZIP contiene **todo lo necesario** para instalar y ejecutar el sistema en un computador nuevo.

## 📋 Requisitos Previos

El computador destino **DEBE tener instalado**:

1. **Docker Desktop** (Windows/Mac) o **Docker + Docker Compose** (Linux)
   - Descargar desde: https://www.docker.com/products/docker-desktop/
   - **IMPORTANTE**: Reiniciar el computador después de instalar Docker

2. **Node.js** (solo si quieres ejecutar el frontend en modo desarrollo)
   - Para producción con Docker, NO es necesario
   - El frontend se construye dentro del contenedor

## 📥 Pasos para Instalar desde el ZIP

### 1. Extraer el ZIP
- Extrae el contenido del ZIP en una carpeta (ej: `C:\frigate-monitoring`)
- Asegúrate de que la carpeta tenga permisos de lectura/escritura

### 2. Ejecutar el Instalador

**Windows:**
```powershell
# Abrir PowerShell como Administrador
cd C:\frigate-monitoring
.\install.ps1
```

**Linux/Mac:**
```bash
chmod +x install.sh
./install.sh
```

### 3. Seguir las Instrucciones
El instalador automáticamente:
- ✅ Verifica que Docker esté instalado
- ✅ Crea los archivos `.env` necesarios
- ✅ Construye las imágenes Docker
- ✅ Inicia todos los servicios

### 4. Acceder al Sistema
- Abre tu navegador en: **http://localhost:5173**
- Usuario: `admin`
- Contraseña: `admin123` (o la que configuraste)

## ⚠️ Lo que el ZIP NO incluye (y está bien)

1. **node_modules/** - Se instala automáticamente cuando Docker construye el frontend
2. **Archivos .env** - Se crean automáticamente por el instalador
3. **Imágenes Docker** - Se descargan automáticamente la primera vez
4. **Base de datos** - Se crea automáticamente al iniciar

## 🔧 Si algo no funciona

### Error: "Docker no está instalado"
- Instala Docker Desktop
- Reinicia el computador
- Inicia Docker Desktop
- Vuelve a ejecutar el instalador

### Error: "No se pueden construir las imágenes"
- Verifica tu conexión a internet (las imágenes se descargan)
- Verifica que Docker esté corriendo
- Intenta: `docker-compose build --no-cache`

### Error: "Puertos en uso"
- Verifica que los puertos 5000, 8000, 5173 no estén en uso
- O modifica los puertos en `docker-compose.yml`

### El frontend no carga
- Espera unos minutos (la primera vez tarda en construir)
- Verifica los logs: `docker-compose logs frontend`
- Verifica que el servicio esté corriendo: `docker-compose ps`

## 📝 Notas Importantes

1. **Primera vez**: La instalación puede tardar 10-20 minutos porque descarga imágenes Docker
2. **Espacio en disco**: Necesitas al menos 5-10 GB libres
3. **Memoria RAM**: Se recomienda al menos 4 GB disponibles
4. **Configuración**: Después de instalar, configura WhatsApp en `backend/.env`

## ✅ Checklist de Verificación

Después de extraer el ZIP, verifica que tengas:
- [ ] Carpeta `backend/` con `requirements.txt`
- [ ] Carpeta `Frontend/rules-panel/` con `package.json`
- [ ] Archivo `docker-compose.yml`
- [ ] Archivo `install.ps1` (Windows) o `install.sh` (Linux/Mac)
- [ ] Carpeta `config/` con `config.yml`
- [ ] Carpeta `python-listener/`

Si todo esto está presente, el ZIP está completo y debería funcionar. 🎉

