#!/usr/bin/env python3
"""
Script de inicio para DESARROLLO LOCAL.
Para producción, usar el entrypoint.sh y Gunicorn.
"""
import uvicorn
import os

if __name__ == "__main__":
    # En desarrollo local, permitimos recarga automática
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
