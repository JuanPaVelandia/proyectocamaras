from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
import logging

from app.api.api import api_router
from app.core.config import settings

# Configurar Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

app = FastAPI(title=settings.PROJECT_NAME)

# Configurar ProxyHeadersMiddleware para Railway (HTTPS)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# Health check endpoints
@app.get("/")
async def root():
    return {"status": "ok", "message": "Frigate Alert System API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rutas
app.include_router(api_router, prefix="/api")

# NOTA: La creación de tablas y usuario admin se debe manejar vía migraciones o scripts externos,
# no automáticamente al inicio de la app para evitar race conditions.
