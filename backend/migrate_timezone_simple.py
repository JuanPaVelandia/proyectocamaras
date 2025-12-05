#!/usr/bin/env python3
"""Script simple para agregar columna timezone"""
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/frigate_events")

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC'"))
        conn.commit()
        print("✅ Columna 'timezone' agregada exitosamente")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            print("✅ La columna 'timezone' ya existe")
        else:
            print(f"❌ Error: {e}")
            raise

