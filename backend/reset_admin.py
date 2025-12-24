import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.all_models import UserDB
from app.core.security import hash_password

def reset_password():
    db = SessionLocal()
    try:
        username = "admin"
        new_password = "Admin123!"
        
        user = db.query(UserDB).filter(UserDB.username == username).first()
        
        if user:
            print(f"User '{username}' found. Updating password...")
            user.password_hash = hash_password(new_password)
            db.commit()
            print(f"✅ Password for user '{username}' has been reset to '{new_password}'")
        else:
            print(f"⚠️ User '{username}' not found! Creating it...")
            user = UserDB(
                username=username,
                email="admin@frigate.local",
                password_hash=hash_password(new_password),
                is_active=True
            )
            db.add(user)
            db.commit()
            print(f"✅ User '{username}' created with password '{new_password}'")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_password()
