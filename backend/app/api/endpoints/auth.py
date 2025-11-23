from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.orm import Session
from typing import Optional
import logging
import re
from app.db.session import SessionLocal
from app.models.all_models import UserDB
from app.core.security import create_access_token, verify_token, hash_password, verify_password
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
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    whatsapp_number: Optional[str] = None
    whatsapp_notifications_enabled: Optional[bool] = False

    @validator('username')
    def validate_username(cls, v):
        if not v or len(v) < 3 or len(v) > 20:
            raise ValueError('El username debe tener entre 3 y 20 caracteres')
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('El username solo puede contener letras, números, guiones y guiones bajos')
        return v.lower()

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('La contraseña debe contener al menos una mayúscula')
        if not re.search(r'[0-9]', v):
            raise ValueError('La contraseña debe contener al menos un número')
        return v

    @validator('whatsapp_number')
    def validate_whatsapp(cls, v):
        if v and not re.match(r'^\+?[1-9]\d{1,14}$', v):
            raise ValueError('Número de WhatsApp inválido (formato internacional: +573001234567)')
        return v
@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Registra un nuevo usuario"""
    
    # Verificar que el username no exista
    existing_user = db.query(UserDB).filter(UserDB.username == req.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El username ya está en uso")
    
    # Verificar que el email no exista
    existing_email = db.query(UserDB).filter(UserDB.email == req.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Hashear la contraseña
    hashed_password = hash_password(req.password)
    
    # Crear usuario
    new_user = UserDB(
        username=req.username,
        email=req.email,
        password_hash=hashed_password,
        whatsapp_number=req.whatsapp_number,
        whatsapp_notifications_enabled=req.whatsapp_notifications_enabled
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logging.info(f"✅ Usuario registrado: {new_user.username} ({new_user.email})")
    
    # Crear token automáticamente
    token = create_access_token(data={"user_id": new_user.id, "username": new_user.username})
    
    return {
        "message": "Usuario registrado exitosamente",
        "token": token,
        "username": new_user.username,
        "email": new_user.email
    }
@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Login con username y contraseña"""
    user = db.query(UserDB).filter(UserDB.username == req.username).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    # Verificar contraseña usando bcrypt
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    # Crear JWT token
    token = create_access_token(data={"user_id": user.id, "username": user.username})
    
    logging.info(f"✅ Login exitoso: {user.username}")
    
    return {
        "token": token,
        "username": user.username,
        "email": user.email,
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

@router.get("/me")
def get_user_info(current_user: UserDB = Depends(get_current_user)):
    """Obtiene la información del usuario autenticado"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "whatsapp_number": current_user.whatsapp_number,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }