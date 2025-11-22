#!/bin/bash
# Script de inicio para Railway
# Railway proporciona $PORT como variable de entorno

PORT=${PORT:-8000}
uvicorn main:app --host 0.0.0.0 --port $PORT

