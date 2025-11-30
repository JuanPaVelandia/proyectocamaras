# 🚀 Guía de Inicio Rápido

## Instalación en 3 Pasos

### 1️⃣ Instalar Docker

**Windows/Mac:**
- Descarga e instala [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Reinicia tu computadora después de instalar

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### 2️⃣ Ejecutar el Instalador

**Windows:**
```powershell
.\install.ps1
```

**Linux/Mac:**
```bash
chmod +x install.sh
./install.sh
```

### 3️⃣ Configurar

1. **Edita `config/config.yml`** con las IPs de tus cámaras
2. **Edita `backend/.env`** con tus credenciales de WhatsApp
3. **Reinicia**: `docker-compose restart`

## ✅ Verificar Instalación

Abre en tu navegador:
- **Frigate UI**: http://localhost:5000
- **API Docs**: http://localhost:8000/docs

## 🎯 Próximos Pasos

1. Configura tus cámaras en `config/config.yml`
2. Obtén credenciales de WhatsApp Business API
3. Configura las variables en `backend/.env`
4. Inicia el frontend y crea tus primeras reglas

## ❓ Problemas?

Ver la sección de **Solución de Problemas** en el README.md principal.

