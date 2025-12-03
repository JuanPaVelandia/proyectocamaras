# Script PowerShell para empaquetar el sistema completo en un ZIP

param(
    [string]$Version = "1.0.0"
)

$PackageName = "frigate-monitoring-v$Version"
$TempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_.FullName }
$PackageDir = Join-Path $TempDir $PackageName

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Empaquetando Sistema de Monitoreo" -ForegroundColor Cyan
Write-Host "Versión: $Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Crear directorio del paquete
New-Item -ItemType Directory -Path $PackageDir -Force | Out-Null

Write-Host "Copiando archivos..." -ForegroundColor Yellow

# Copiar estructura del proyecto
$ItemsToCopy = @(
    "backend",
    "config",
    "mosquitto",
    "python-listener",
    "docker-compose.yml",
    "docker-compose.prod.yml",
    "docker-compose.client.yml",
    "install.sh",
    "install.ps1",
    "setup_ssl.sh",
    "README.md",
    "QUICK_START.md",
    "GUIA_DESPLIEGUE.md",
    "CHECKLIST_PRODUCCION.md",
    "RESUMEN_PRODUCCION.md",
    "ESTRATEGIA_DISTRIBUCION.md",
    "MEJOR_ESTRATEGIA.md",
    "GUIA_INSTALACION_VISUAL.md",
    "INSTRUCCIONES_ZIP.md",
    "GUIA_USO_WEB.md",
    ".gitignore"
)

foreach ($item in $ItemsToCopy) {
    if (Test-Path $item) {
        Copy-Item -Path $item -Destination $PackageDir -Recurse -Force
    }
}

# Copiar frontend
$FrontendSource = "..\Proyecto Camaras\Frontend\rules-panel"
if (Test-Path $FrontendSource) {
    $FrontendDest = Join-Path $PackageDir "Frontend\rules-panel"
    New-Item -ItemType Directory -Path (Split-Path $FrontendDest) -Force | Out-Null
    Copy-Item -Path $FrontendSource -Destination $FrontendDest -Recurse -Force
    
    # Eliminar node_modules
    $NodeModules = Join-Path $FrontendDest "node_modules"
    if (Test-Path $NodeModules) {
        Remove-Item -Path $NodeModules -Recurse -Force
    }
}

# Limpiar archivos innecesarios
Write-Host "Limpiando archivos innecesarios..." -ForegroundColor Yellow

# Eliminar __pycache__
Get-ChildItem -Path $PackageDir -Filter "__pycache__" -Recurse -Directory | Remove-Item -Recurse -Force

# Eliminar .pyc
Get-ChildItem -Path $PackageDir -Filter "*.pyc" -Recurse -File | Remove-Item -Force

# Eliminar .git
Get-ChildItem -Path $PackageDir -Filter ".git" -Recurse -Directory | Remove-Item -Recurse -Force

# Eliminar .env
Get-ChildItem -Path $PackageDir -Filter ".env" -Recurse -File | Remove-Item -Force

# Eliminar .db
Get-ChildItem -Path $PackageDir -Filter "*.db" -Recurse -File | Remove-Item -Force

# Eliminar .log
Get-ChildItem -Path $PackageDir -Filter "*.log" -Recurse -File | Remove-Item -Force

# Crear archivo de versión
"$Version" | Out-File -FilePath (Join-Path $PackageDir "VERSION.txt") -Encoding UTF8

# Crear README del paquete
$ReadmeContent = @"
========================================
Sistema de Monitoreo con Frigate
Versión $Version
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
  - INSTRUCCIONES_ZIP.md - ⭐ EMPIEZA AQUÍ - Instrucciones para usar este ZIP
  - GUIA_INSTALACION_VISUAL.md - Guía visual paso a paso
  - QUICK_START.md - Guía rápida
  - README.md - Documentación completa
  - GUIA_DESPLIEGUE.md - Guía de despliegue en producción

REQUISITOS:
  - Docker Desktop instalado (Windows/Mac) o Docker + Docker Compose (Linux)
  - Al menos 5-10 GB de espacio en disco
  - Conexión a internet (para descargar imágenes Docker)

SOPORTE:
  Revisa INSTRUCCIONES_ZIP.md primero. Si tienes problemas, revisa la documentación incluida.

========================================
"@

$ReadmeContent | Out-File -FilePath (Join-Path $PackageDir "LEEME.txt") -Encoding UTF8

# Crear ZIP
Write-Host "Creando ZIP..." -ForegroundColor Yellow
$ZipPath = Join-Path (Get-Location) "$PackageName.zip"

# Comprimir usando .NET
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($PackageDir, $ZipPath)

# Limpiar
Remove-Item -Path $TempDir -Recurse -Force

Write-Host ""
Write-Host "Paquete creado: $PackageName.zip" -ForegroundColor Green
Write-Host "Ubicación: $ZipPath" -ForegroundColor Green
Write-Host ""
Write-Host "El paquete está listo para distribuir!" -ForegroundColor Cyan

