import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.session import SessionLocal, engine
from app.models.all_models import Base, CameraDB

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Crea la tabla cameras en PostgreSQL"""
    try:
        logger.info("🔄 Iniciando migración: Crear tabla cameras")
        
        # Crear todas las tablas (solo crea las que no existen)
        Base.metadata.create_all(bind=engine)
        
        logger.info("✅ Migración completada: Tabla cameras creada")
        
        # Verificar que la tabla existe
        db = SessionLocal()
        try:
            result = db.execute(text("SELECT COUNT(*) FROM cameras"))
            count = result.scalar()
            logger.info(f"📊 Tabla cameras verificada. Registros actuales: {count}")
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Error en migración: {e}")
        raise

if __name__ == "__main__":
    migrate()
