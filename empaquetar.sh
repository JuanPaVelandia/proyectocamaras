#!/bin/bash
# Script para empaquetar el sistema completo en un ZIP

VERSION=${1:-"1.0.0"}
PACKAGE_NAME="frigate-monitoring-v${VERSION}"
TEMP_DIR=$(mktemp -d)

echo "========================================"
echo "Empaquetando Sistema de Monitoreo"
echo "Versión: $VERSION"
echo "========================================"
echo ""

# Crear directorio del paquete
PACKAGE_DIR="$TEMP_DIR/$PACKAGE_NAME"
mkdir -p "$PACKAGE_DIR"

echo "📦 Copiando archivos..."

# Copiar estructura del proyecto
cp -r backend "$PACKAGE_DIR/"
cp -r config "$PACKAGE_DIR/"
cp -r mosquitto "$PACKAGE_DIR/"
cp -r python-listener "$PACKAGE_DIR/"
cp docker-compose.yml "$PACKAGE_DIR/"
cp docker-compose.prod.yml "$PACKAGE_DIR/"
cp docker-compose.client.yml "$PACKAGE_DIR/"
cp install.sh "$PACKAGE_DIR/"
cp install.ps1 "$PACKAGE_DIR/"
cp setup_ssl.sh "$PACKAGE_DIR/"
cp README.md "$PACKAGE_DIR/"
cp QUICK_START.md "$PACKAGE_DIR/"
cp GUIA_DESPLIEGUE.md "$PACKAGE_DIR/"
cp CHECKLIST_PRODUCCION.md "$PACKAGE_DIR/"
cp RESUMEN_PRODUCCION.md "$PACKAGE_DIR/"
cp ESTRATEGIA_DISTRIBUCION.md "$PACKAGE_DIR/"
cp MEJOR_ESTRATEGIA.md "$PACKAGE_DIR/"
cp .gitignore "$PACKAGE_DIR/"

# Copiar frontend
mkdir -p "$PACKAGE_DIR/Frontend"
cp -r "../Proyecto Camaras/Frontend/rules-panel" "$PACKAGE_DIR/Frontend/"

# Excluir node_modules del frontend
rm -rf "$PACKAGE_DIR/Frontend/rules-panel/node_modules"

# Excluir archivos innecesarios
find "$PACKAGE_DIR" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null
find "$PACKAGE_DIR" -name "*.pyc" -delete
find "$PACKAGE_DIR" -name ".git" -type d -exec rm -rf {} + 2>/dev/null
find "$PACKAGE_DIR" -name ".env" -type f -delete
find "$PACKAGE_DIR" -name "*.db" -type f -delete
find "$PACKAGE_DIR" -name "*.log" -type f -delete

# Crear archivo de versión
echo "$VERSION" > "$PACKAGE_DIR/VERSION.txt"

# Crear README del paquete
cat > "$PACKAGE_DIR/LEEME.txt" << EOF
========================================
Sistema de Monitoreo con Frigate
Versión $VERSION
========================================

INSTRUCCIONES DE INSTALACIÓN:

Windows:
  1. Ejecutar install.ps1 como administrador
  2. Seguir las instrucciones en pantalla

Linux/Mac:
  1. Ejecutar: chmod +x install.sh
  2. Ejecutar: ./install.sh
  3. Seguir las instrucciones en pantalla

DOCUMENTACIÓN:
  - QUICK_START.md - Guía rápida
  - README.md - Documentación completa
  - GUIA_DESPLIEGUE.md - Guía de despliegue

SOPORTE:
  Revisa la documentación incluida o contacta al soporte técnico.

========================================
EOF

echo "📦 Creando ZIP..."
cd "$TEMP_DIR"
zip -r "${PACKAGE_NAME}.zip" "$PACKAGE_NAME" -q

# Mover ZIP al directorio actual
mv "${PACKAGE_NAME}.zip" "$(pwd)/../"

# Limpiar
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Paquete creado: ${PACKAGE_NAME}.zip"
echo "📁 Ubicación: $(pwd)/../${PACKAGE_NAME}.zip"
echo ""
echo "El paquete está listo para distribuir!"

