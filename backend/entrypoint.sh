#!/bin/bash
set -e

# Función para esperar a que la base de datos esté lista
wait_for_db() {
    echo "🔄 Esperando a que la base de datos esté disponible..."
    python << END
import sys
import time
import psycopg2
from app.core.config import settings

start_time = time.time()
while True:
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        conn.close()
        sys.exit(0)
    except Exception as e:
        if time.time() - start_time > 30:
            print(f"❌ Timeout esperando a la base de datos: {e}")
            sys.exit(1)
        time.sleep(1)
END
}

# 1. Esperar a la DB
wait_for_db
echo "✅ Base de datos conectada."

# 2. Ejecutar migraciones
echo "🔄 Ejecutando migraciones..."
# Si se define FORCE_STAMP, marcamos la DB como actualizada
if [ -n "$FORCE_STAMP" ]; then
    if [ "$FORCE_STAMP" = "true" ]; then
        STAMP_TARGET="head"
    else
        STAMP_TARGET="$FORCE_STAMP"
    fi
    echo "⚠️ FORCE_STAMP detectado. Marcando base de datos como '$STAMP_TARGET'..."
    alembic stamp "$STAMP_TARGET"
fi

alembic upgrade head
echo "✅ Migraciones completadas."

# 3. Iniciar Gunicorn
echo "🚀 Iniciando servidor de producción con Gunicorn..."
exec gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:$PORT \
    --access-logfile - \
    --error-logfile -
