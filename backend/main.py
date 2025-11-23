from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
import logging
import os
from dotenv import load_dotenv

from app.api.api import api_router
from app.db.session import engine
from app.db.base import Base
from app.models.all_models import UserDB # Importar modelos para que se registren en Base

# Cargar variables de entorno
load_dotenv()

# Crear tablas en DB (si no existen)
# Manejar errores de conexión a la base de datos
try:
    Base.metadata.create_all(bind=engine)
    logging.info("✅ Base de datos conectada correctamente")
except Exception as e:
    logging.warning(f"⚠️  No se pudo conectar a la base de datos al inicio: {e}")
    logging.info("La aplicación continuará, pero algunas funciones pueden no funcionar")

# Configurar Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

# ... (imports existentes)

app = FastAPI(title="Frigate Alert System")

# Configurar ProxyHeadersMiddleware para Railway (HTTPS)
# Esto permite que FastAPI sepa que está detrás de un proxy HTTPS y genere URLs correctas
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# Health check endpoints para Railway
@app.get("/")
async def root():
    return {"status": "ok", "message": "Frigate Alert System API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Configurar CORS
# En desarrollo: localhost
# En producción: agregar tu dominio real
DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

PROD_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []

# Permitir todos los orígenes de Vercel usando regex
# O usar allow_origins=["*"] para desarrollo (no recomendado en producción)
VERCEL_PATTERN = r"https://.*\.vercel\.app"

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=VERCEL_PATTERN,  # Permite todos los subdominios de vercel.app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rutas
app.include_router(api_router, prefix="/api")

# Inicializar usuario admin por defecto (si es necesario)
from app.db.session import SessionLocal
from app.core.security import hash_password
import os

def init_default_admin():
    db = SessionLocal()
    try:
        count = db.query(UserDB).count()
        if count == 0:
            username = os.getenv("ADMIN_USERNAME", "admin")
            password = os.getenv("ADMIN_PASSWORD", "Admin123!")
            email = os.getenv("ADMIN_EMAIL", "admin@frigate.local")
            whatsapp = os.getenv("DEFAULT_ADMIN_WHATSAPP") or os.getenv("WHATSAPP_TARGET_NUMBER") or "+573001234567"

            # Hashear la contraseña con bcrypt
            password_hashed = hash_password(password)

            user = UserDB(
                username=username,
                password_hash=password_hashed,
                email=email,
                whatsapp_number=whatsapp
            )
            db.add(user)
            db.commit()
            logging.info(f"✅ Usuario admin por defecto creado: {username} ({email})")
    finally:
        db.close()

init_default_admin()
