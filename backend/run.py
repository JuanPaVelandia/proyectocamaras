#!/usr/bin/env python3
"""
Script de inicio para Railway
Lee el puerto de la variable de entorno PORT
"""
import os
import sys
import logging

# Configurar logging básico
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ejecutar migraciones (solo se ejecutan una vez)
try:
    logger.info("🔄 Ejecutando migraciones de base de datos...")

    # Migración 1: Tabla de cámaras
    from migrate_add_cameras_table import migrate as migrate_cameras
    migrate_cameras()

    # Migración 2: Campo whatsapp_notifications_enabled
    from migrate_add_whatsapp_enabled import migrate as migrate_whatsapp
    migrate_whatsapp()

    logger.info("✅ Migraciones completadas")
except Exception as e:
    logger.warning(f"⚠️ Migración falló o ya fue ejecutada: {e}")

try:
    import uvicorn
    logger.info("✅ uvicorn importado correctamente")
except ImportError as e:
    logger.error(f"❌ Error importando uvicorn: {e}")
    sys.exit(1)

try:
    # Intentar importar la app para verificar que todo esté bien
    from main import app
    logger.info("✅ main:app importado correctamente")
except Exception as e:
    logger.error(f"❌ Error importando main:app: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    logger.info(f"🚀 Iniciando servidor en puerto {port}")
    
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            log_level="info"
        )
    except Exception as e:
        logger.error(f"❌ Error iniciando uvicorn: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
