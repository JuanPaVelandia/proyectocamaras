# Script de instalación para Windows
# Sistema de Monitoreo con Frigate + Alertas Inteligentes

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Sistema de Monitoreo con Frigate    ║" -ForegroundColor Cyan
Write-Host "║  Instalador Automático v1.0          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
Write-Host "🔍 Verificando requisitos del sistema..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  [1/3] Verificando Docker..." -ForegroundColor White
try {
    $dockerVersion = docker --version
    Write-Host "      ✓ Docker encontrado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "      ✗ Docker no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "  ⚠️  ACCIÓN REQUERIDA:" -ForegroundColor Yellow
    Write-Host "     Por favor instala Docker Desktop desde:" -ForegroundColor White
    Write-Host "     https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "     Después de instalar Docker Desktop:" -ForegroundColor White
    Write-Host "     1. Reinicia tu computadora" -ForegroundColor White
    Write-Host "     2. Inicia Docker Desktop" -ForegroundColor White
    Write-Host "     3. Ejecuta este script nuevamente" -ForegroundColor White
    Write-Host ""
    Write-Host "Presiona cualquier tecla para salir..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "  [2/3] Verificando Docker Compose..." -ForegroundColor White
try {
    $composeVersion = docker compose version
    Write-Host "      ✓ Docker Compose encontrado: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "      ✗ Docker Compose no está disponible" -ForegroundColor Red
    Write-Host ""
    Write-Host "  ⚠️  Asegúrate de tener Docker Desktop actualizado" -ForegroundColor Yellow
    exit 1
}

Write-Host "  [3/3] Verificando que Docker esté corriendo..." -ForegroundColor White
try {
    docker ps | Out-Null
    Write-Host "      ✓ Docker está corriendo" -ForegroundColor Green
} catch {
    Write-Host "      ✗ Docker no está corriendo" -ForegroundColor Red
    Write-Host ""
    Write-Host "  ⚠️  Por favor inicia Docker Desktop y espera a que esté listo" -ForegroundColor Yellow
    Write-Host "     Luego ejecuta este script nuevamente" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "⚙️  Configuración Inicial" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Crear archivos .env si no existen
if (-not (Test-Path "backend\.env")) {
    Write-Host "Creando backend/.env..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env" -ErrorAction SilentlyContinue
    if (-not (Test-Path "backend\.env")) {
        @"
DATABASE_URL=postgresql://postgres:postgres@db:5432/frigate_events
JWT_SECRET_KEY=super-secret-key-change-in-production-$(Get-Random)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
"@ | Out-File -FilePath "backend\.env" -Encoding UTF8
    }
    Write-Host "✓ Archivo backend/.env creado" -ForegroundColor Green
    Write-Host "  IMPORTANTE: Edita backend/.env y configura tus credenciales" -ForegroundColor Yellow
} else {
    Write-Host "✓ backend/.env ya existe" -ForegroundColor Green
}

if (-not (Test-Path "python-listener\.env")) {
    Write-Host "Creando python-listener/.env..." -ForegroundColor Yellow
    @"
MQTT_HOST=mosquitto
MQTT_PORT=1883
CLOUD_API_URL=http://backend:8000/api/events/
CLOUD_API_KEY=super-token-secreto
CUSTOMER_ID=cliente_demo
SITE_ID=sede_demo
"@ | Out-File -FilePath "python-listener\.env" -Encoding UTF8
    Write-Host "✓ Archivo python-listener/.env creado" -ForegroundColor Green
} else {
    Write-Host "✓ python-listener/.env ya existe" -ForegroundColor Green
}

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔨 Construyendo Imágenes Docker" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ Esto puede tardar varios minutos la primera vez..." -ForegroundColor Yellow
Write-Host "   (Las imágenes se descargarán de internet)" -ForegroundColor Gray
Write-Host ""

docker-compose build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Error construyendo las imágenes" -ForegroundColor Red
    Write-Host "Revisa los errores arriba" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 Iniciando Servicios" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Error iniciando los servicios" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Esperando que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Verificación Final" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar servicios
$services = @("mosquitto", "frigate", "db", "frigate_backend", "frigate_listener")
$allRunning = $true

foreach ($service in $services) {
    $status = docker ps --filter "name=$service" --format "{{.Status}}"
    if ($status) {
        Write-Host "✓ $service está corriendo" -ForegroundColor Green
    } else {
        Write-Host "✗ $service NO está corriendo" -ForegroundColor Red
        $allRunning = $false
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🎉 Instalación Completada" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($allRunning) {
    Write-Host "✅ Todos los servicios están corriendo correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 URLs de acceso:" -ForegroundColor Cyan
    Write-Host "   📹 Frigate UI:    http://localhost:5000" -ForegroundColor White
    Write-Host "   🔧 Backend API:   http://localhost:8000" -ForegroundColor White
    Write-Host "   📚 API Docs:      http://localhost:8000/docs" -ForegroundColor White
    Write-Host "   🎛️  Panel Admin:    http://localhost:5173" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   ⚠️  IMPORTANTE: El frontend debe iniciarse manualmente" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   1. Abre una NUEVA terminal/PowerShell" -ForegroundColor White
    Write-Host "   2. Navega a la carpeta del frontend:" -ForegroundColor White
    Write-Host "      cd Frontend\rules-panel" -ForegroundColor Cyan
    Write-Host "   3. Instala dependencias (solo la primera vez):" -ForegroundColor White
    Write-Host "      npm install" -ForegroundColor Cyan
    Write-Host "   4. Inicia el frontend:" -ForegroundColor White
    Write-Host "      npm run dev" -ForegroundColor Cyan
    Write-Host "   5. Abre http://localhost:5173 en tu navegador" -ForegroundColor White
    Write-Host "   6. Inicia sesión (usuario: admin, contraseña: admin123)" -ForegroundColor White
    Write-Host "   7. Sigue el asistente de configuración inicial" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Tip: El asistente te guiará paso a paso en la primera vez" -ForegroundColor Cyan
    Write-Host "💡 Tip: Mantén la terminal con 'npm run dev' abierta mientras uses el sistema" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Algunos servicios no están corriendo" -ForegroundColor Yellow
    Write-Host "   Revisa los logs con: docker-compose logs" -ForegroundColor White
    Write-Host "   O reinicia con: docker-compose restart" -ForegroundColor White
}

Write-Host ""
Write-Host "📖 Comandos útiles:" -ForegroundColor Gray
Write-Host "   Detener:    docker-compose down" -ForegroundColor DarkGray
Write-Host "   Iniciar:    docker-compose up -d" -ForegroundColor DarkGray
Write-Host "   Logs:       docker-compose logs -f" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

