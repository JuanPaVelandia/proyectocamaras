#!/usr/bin/env python3
"""
Script de inicio para Railway
Lee el puerto de la variable de entorno PORT
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

