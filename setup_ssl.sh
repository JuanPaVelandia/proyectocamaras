#!/bin/bash
# Script para configurar SSL con Let's Encrypt usando Certbot

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Uso: ./setup_ssl.sh <dominio> <email>"
    echo "Ejemplo: ./setup_ssl.sh ejemplo.com admin@ejemplo.com"
    exit 1
fi

echo "Configurando SSL para $DOMAIN..."

# Instalar certbot si no está instalado
if ! command -v certbot &> /dev/null; then
    echo "Instalando certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# Crear directorio para certificados
mkdir -p nginx/ssl

# Obtener certificado
sudo certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

# Copiar certificados
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem

# Actualizar nginx.conf con el dominio
sed -i "s/server_name _;/server_name $DOMAIN;/g" nginx/nginx.conf

echo "✅ Certificados SSL configurados en nginx/ssl/"
echo "⚠️  Recuerda actualizar el dominio en nginx/nginx.conf"

