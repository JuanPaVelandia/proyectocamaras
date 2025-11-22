"""
Script de migración para agregar campos time_start y time_end a la tabla rules.

Este script agrega las columnas time_start y time_end a la tabla rules
si no existen ya.

Uso:
    python migrate_add_time_fields.py
"""
import os
import sys
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Obtener DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///events.db")

print(f"🔌 Conectando a la base de datos: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

# Crear engine
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

def column_exists(connection, table_name, column_name):
    """Verifica si una columna existe en una tabla."""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def migrate():
    """Ejecuta la migración."""
    try:
        with engine.connect() as connection:
            # Verificar si la tabla rules existe
            inspector = inspect(engine)
            if 'rules' not in inspector.get_table_names():
                print("❌ La tabla 'rules' no existe. Asegúrate de que la base de datos esté inicializada.")
                return False

            # Verificar si las columnas ya existen
            has_time_start = column_exists(connection, 'rules', 'time_start')
            has_time_end = column_exists(connection, 'rules', 'time_end')

            if has_time_start and has_time_end:
                print("✅ Las columnas time_start y time_end ya existen. No se requiere migración.")
                return True

            # Iniciar transacción
            trans = connection.begin()
            
            try:
                # Agregar time_start si no existe
                if not has_time_start:
                    print("📝 Agregando columna time_start...")
                    if DATABASE_URL.startswith("sqlite"):
                        connection.execute(text("ALTER TABLE rules ADD COLUMN time_start VARCHAR(5)"))
                    else:
                        # PostgreSQL
                        connection.execute(text("ALTER TABLE rules ADD COLUMN time_start VARCHAR(5)"))
                    print("✅ Columna time_start agregada correctamente.")
                else:
                    print("ℹ️  Columna time_start ya existe.")

                # Agregar time_end si no existe
                if not has_time_end:
                    print("📝 Agregando columna time_end...")
                    if DATABASE_URL.startswith("sqlite"):
                        connection.execute(text("ALTER TABLE rules ADD COLUMN time_end VARCHAR(5)"))
                    else:
                        # PostgreSQL
                        connection.execute(text("ALTER TABLE rules ADD COLUMN time_end VARCHAR(5)"))
                    print("✅ Columna time_end agregada correctamente.")
                else:
                    print("ℹ️  Columna time_end ya existe.")

                # Confirmar transacción
                trans.commit()
                print("\n🎉 Migración completada exitosamente!")
                return True

            except Exception as e:
                trans.rollback()
                print(f"❌ Error durante la migración: {e}")
                return False

    except OperationalError as e:
        print(f"❌ Error de conexión a la base de datos: {e}")
        print("\n💡 Verifica que:")
        print("   1. La base de datos esté corriendo")
        print("   2. Las credenciales en .env sean correctas")
        print("   3. El archivo events.db exista (si usas SQLite)")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Script de Migración: Agregar Campos de Rango Horario")
    print("=" * 60)
    print()
    
    success = migrate()
    
    print()
    print("=" * 60)
    if success:
        print("✅ Proceso completado exitosamente")
    else:
        print("❌ El proceso falló. Revisa los errores arriba.")
        sys.exit(1)
    print("=" * 60)

