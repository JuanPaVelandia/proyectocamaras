#!/usr/bin/env python3
"""
Script de migración para agregar campos OAuth a la tabla users
Ejecutar: python migrate_add_oauth_fields.py
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
    print("🔄 Iniciando migración: Agregar campos OAuth...")
    
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Verificar si las columnas ya existen
        result = session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='oauth_provider'
        """))
        
        if result.fetchone():
            print("✅ Los campos OAuth ya existen. No es necesario migrar.")
            return
        
        print("📝 Agregando columnas OAuth...")
        
        # Agregar columnas OAuth
        session.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50),
            ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS email VARCHAR(255),
            ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """))
        
        # Hacer password_hash nullable (para usuarios OAuth)
        session.execute(text("""
            ALTER TABLE users 
            ALTER COLUMN password_hash DROP NOT NULL
        """))
        
        session.commit()
        print("✅ Migración completada exitosamente!")
        print("   - Campos OAuth agregados")
        print("   - password_hash ahora es nullable")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error en la migración: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    migrate()

