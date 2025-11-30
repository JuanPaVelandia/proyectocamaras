#!/usr/bin/env python3
"""
Script de migración para agregar campo whatsapp_notifications_enabled a la tabla users
Ejecutar: python migrate_add_whatsapp_enabled.py
"""

import sys
import os
from pathlib import Path

# Agregar el directorio del backend al path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv(backend_dir / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/frigate_events")

def migrate():
    print("🔄 Iniciando migración: Agregar campo whatsapp_notifications_enabled...")

    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Verificar si la columna ya existe
        result = session.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='users' AND column_name='whatsapp_notifications_enabled'
        """))

        if result.fetchone():
            print("✅ El campo whatsapp_notifications_enabled ya existe. No es necesario migrar.")
            return

        print("📝 Agregando columna whatsapp_notifications_enabled...")

        # Agregar columna
        session.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN DEFAULT FALSE
        """))

        session.commit()
        print("✅ Migración completada exitosamente!")
        print("   - Campo whatsapp_notifications_enabled agregado (default: FALSE)")

    except Exception as e:
        session.rollback()
        print(f"❌ Error en la migración: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    migrate()
