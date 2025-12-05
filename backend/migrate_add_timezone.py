#!/usr/bin/env python3
"""
Script de migración para agregar el campo timezone a la tabla users.

Ejecutar:
    python migrate_add_timezone.py
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Agregar el directorio actual al path para importar módulos
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

def migrate():
    """Agrega el campo timezone a la tabla users si no existe"""
    
    # Crear engine
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    
    # Verificar si la columna ya existe
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'timezone' in columns:
        print("✅ La columna 'timezone' ya existe en la tabla 'users'")
        return
    
    print("📝 Agregando columna 'timezone' a la tabla 'users'...")
    
    # Determinar el tipo de base de datos
    db_url = settings.DATABASE_URL.lower()
    
    with engine.connect() as conn:
        if 'postgresql' in db_url or 'postgres' in db_url:
            # PostgreSQL
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC'
            """))
            conn.commit()
            print("✅ Columna 'timezone' agregada exitosamente (PostgreSQL)")
        elif 'sqlite' in db_url:
            # SQLite (no soporta IF NOT EXISTS en ALTER TABLE ADD COLUMN)
            try:
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'
                """))
                conn.commit()
                print("✅ Columna 'timezone' agregada exitosamente (SQLite)")
            except Exception as e:
                if 'duplicate column' in str(e).lower() or 'already exists' in str(e).lower():
                    print("✅ La columna 'timezone' ya existe")
                else:
                    raise
        else:
            # Otros (MySQL, etc.)
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'
            """))
            conn.commit()
            print("✅ Columna 'timezone' agregada exitosamente")
    
    # Actualizar usuarios existentes sin timezone
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        from app.utils.timezone_utils import get_timezone_from_phone
        from app.models.all_models import UserDB
        
        users_without_timezone = db.query(UserDB).filter(
            (UserDB.timezone == None) | (UserDB.timezone == 'UTC')
        ).all()
        
        updated_count = 0
        for user in users_without_timezone:
            if user.whatsapp_number:
                user.timezone = get_timezone_from_phone(user.whatsapp_number)
                updated_count += 1
            else:
                user.timezone = "UTC"
        
        if updated_count > 0:
            db.commit()
            print(f"✅ Actualizados {updated_count} usuarios con timezone basado en su teléfono")
        else:
            print("ℹ️  No hay usuarios para actualizar")
    except Exception as e:
        print(f"⚠️  Error actualizando usuarios existentes: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    try:
        migrate()
        print("\n✅ Migración completada exitosamente")
    except Exception as e:
        print(f"\n❌ Error en la migración: {e}")
        sys.exit(1)

