from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI(title="Frigate Alert System")

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

origins = DEV_ORIGINS + [origin.strip() for origin in PROD_ORIGINS if origin.strip()]

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
import os

def init_default_admin():
    db = SessionLocal()
    try:
        count = db.query(UserDB).count()
        if count == 0:
            username = os.getenv("ADMIN_USERNAME", "admin")
            password = os.getenv("ADMIN_PASSWORD", "admin123")
            whatsapp = os.getenv("DEFAULT_ADMIN_WHATSAPP") or os.getenv("WHATSAPP_TARGET_NUMBER") or ""

            user = UserDB(
                username=username,
                password_hash=password,
                whatsapp_number=whatsapp
            )
            db.add(user)
            db.commit()
            logging.info(f"✅ Usuario admin por defecto creado: {username}")
    finally:
        db.close()

init_default_admin()
