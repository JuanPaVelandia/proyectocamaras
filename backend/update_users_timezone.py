#!/usr/bin/env python3
"""Script para actualizar timezone de usuarios existentes"""
import sys
sys.path.insert(0, '/app')

from app.db.session import SessionLocal
from app.models.all_models import UserDB
from app.utils.timezone_utils import get_timezone_from_phone

db = SessionLocal()
try:
    users = db.query(UserDB).all()
    updated = 0
    
    for user in users:
        if user.whatsapp_number:
            new_timezone = get_timezone_from_phone(user.whatsapp_number)
            if new_timezone != user.timezone:
                user.timezone = new_timezone
                updated += 1
                print(f"✅ Usuario {user.username}: timezone actualizado a {new_timezone}")
        elif not user.timezone:
            user.timezone = "UTC"
            updated += 1
            print(f"✅ Usuario {user.username}: timezone establecido a UTC (sin teléfono)")
    
    if updated > 0:
        db.commit()
        print(f"\n✅ Total: {updated} usuarios actualizados")
    else:
        print("\nℹ️  No hay usuarios para actualizar")
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()

