#!/bin/bash
# Script de instalación para Linux/Mac
# Sistema de Monitoreo con Frigate + Alertas Inteligentes

echo "========================================"
echo "Instalador del Sistema de Monitoreo"
echo "========================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Verificar Docker
echo -e "${YELLOW}Verificando Docker...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓ Docker encontrado: $DOCKER_VERSION${NC}"
else
    echo -e "${RED}✗ Docker no está instalado${NC}"
    echo ""
    echo "Por favor instala Docker desde:"
    echo "https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar Docker Compose
echo -e "${YELLOW}Verificando Docker Compose...${NC}"
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    echo -e "${GREEN}✓ Docker Compose encontrado: $COMPOSE_VERSION${NC}"
else
    echo -e "${RED}✗ Docker Compose no está disponible${NC}"
    echo "Asegúrate de tener Docker instalado correctamente"
    exit 1
fi

echo ""
echo -e "${YELLOW}Verificando que Docker esté corriendo...${NC}"
if docker ps &> /dev/null; then
    echo -e "${GREEN}✓ Docker está corriendo${NC}"
else
    echo -e "${RED}✗ Docker no está corriendo${NC}"
    echo "Por favor inicia el servicio de Docker"
    exit 1
fi

echo ""
echo "========================================"
echo "Configuración Inicial"
echo "========================================"
echo ""

# Crear archivos .env si no existen
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Creando backend/.env...${NC}"
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
    else
        cat > backend/.env << EOF
DATABASE_URL=postgresql://postgres:postgres@db:5432/frigate_events
JWT_SECRET_KEY=super-secret-key-change-in-production-$(openssl rand -hex 16)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
EOF
    fi
    echo -e "${GREEN}✓ Archivo backend/.env creado${NC}"
    echo -e "${YELLOW}  IMPORTANTE: Edita backend/.env y configura tus credenciales${NC}"
else
    echo -e "${GREEN}✓ backend/.env ya existe${NC}"
fi

if [ ! -f "python-listener/.env" ]; then
    echo -e "${YELLOW}Creando python-listener/.env...${NC}"
    cat > python-listener/.env << EOF
MQTT_HOST=mosquitto
MQTT_PORT=1883
CLOUD_API_URL=http://backend:8000/api/events/
CLOUD_API_KEY=super-token-secreto
CUSTOMER_ID=cliente_demo
SITE_ID=sede_demo
EOF
    echo -e "${GREEN}✓ Archivo python-listener/.env creado${NC}"
else
    echo -e "${GREEN}✓ python-listener/.env ya existe${NC}"
fi

echo ""
echo "========================================"
echo "Construyendo Imágenes Docker"
echo "========================================"
echo ""

echo -e "${YELLOW}Esto puede tardar varios minutos la primera vez...${NC}"
echo ""

docker-compose build

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}✗ Error construyendo las imágenes${NC}"
    echo "Revisa los errores arriba"
    exit 1
fi

echo ""
echo "========================================"
echo "Iniciando Servicios"
echo "========================================"
echo ""

docker-compose up -d

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}✗ Error iniciando los servicios${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Esperando que los servicios estén listos...${NC}"
sleep 10

echo ""
echo "========================================"
echo "Verificación"
echo "========================================"
echo ""

# Verificar servicios
SERVICES=("mosquitto" "frigate" "db" "frigate_backend" "frigate_listener")
ALL_RUNNING=true

for service in "${SERVICES[@]}"; do
    if docker ps --filter "name=$service" --format "{{.Status}}" | grep -q .; then
        echo -e "${GREEN}✓ $service está corriendo${NC}"
    else
        echo -e "${RED}✗ $service NO está corriendo${NC}"
        ALL_RUNNING=false
    fi
done

echo ""
echo "========================================"
echo "Instalación Completada"
echo "========================================"
echo ""

if [ "$ALL_RUNNING" = true ]; then
    echo -e "${GREEN}✓ Todos los servicios están corriendo${NC}"
    echo ""
    echo -e "${CYAN}URLs de acceso:${NC}"
    echo "  - Frigate UI: http://localhost:5000"
    echo "  - Backend API: http://localhost:8000"
    echo "  - API Docs: http://localhost:8000/docs"
    echo ""
    echo -e "${YELLOW}Próximos pasos:${NC}"
    echo "  1. Edita config/config.yml con tus cámaras IP"
    echo "  2. Configura backend/.env con tus credenciales de WhatsApp"
    echo "  3. Reinicia los servicios: docker-compose restart"
    echo "  4. Accede al frontend para crear reglas"
else
    echo -e "${YELLOW}⚠ Algunos servicios no están corriendo${NC}"
    echo "Revisa los logs con: docker-compose logs"
fi

echo ""
echo "Para detener los servicios: docker-compose down"
echo "Para ver logs: docker-compose logs -f"
echo ""

