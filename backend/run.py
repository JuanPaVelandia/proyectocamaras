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

# Ejecutar migraciones con Alembic
try:
    logger.info("🔄 Ejecutando migraciones de base de datos (Alembic)...")
    import subprocess
    subprocess.run(["alembic", "upgrade", "head"], check=True)
    logger.info("✅ Migraciones completadas")
except Exception as e:
    logger.error(f"❌ Error ejecutando migraciones: {e}")
    # No salimos, intentamos iniciar la app de todos modos, aunque podría fallar si la DB no está lista


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
