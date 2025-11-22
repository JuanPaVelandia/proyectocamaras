from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.db.session import SessionLocal
from app.models.all_models import UserDB
from app.core.security import create_access_token, verify_token

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.username == req.username).first()
    
    if not user or user.password_hash != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Crear JWT token
    token = create_access_token(data={"user_id": user.id, "username": user.username})
    
    logging.info(f"✅ Login exitoso: {user.username}")
    
    return {
        "token": token,
        "username": user.username,
        "whatsapp_number": user.whatsapp_number
    }

def get_current_user(
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    db: Session = Depends(get_db)
) -> UserDB:
    if not x_admin_token:
        raise HTTPException(status_code=401, detail="Missing X-Admin-Token header")
    
    # Verificar JWT
    payload = verify_token(x_admin_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = db.query(UserDB).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user
