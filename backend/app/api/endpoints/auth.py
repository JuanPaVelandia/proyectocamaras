from fastapi import APIRouter, HTTPException, Depends, Header, BackgroundTasks
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
        "whatsapp_notifications_enabled": current_user.whatsapp_notifications_enabled,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

class UpdateProfileRequest(BaseModel):
    email: Optional[EmailStr] = None
    whatsapp_number: Optional[str] = None
    whatsapp_notifications_enabled: Optional[bool] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

    @validator('whatsapp_number')
    def validate_whatsapp(cls, v):
        if v and not re.match(r'^\+?[1-9]\d{1,14}$', v):
            raise ValueError('Número de WhatsApp inválido (formato internacional: +573001234567)')
        return v

    @validator('new_password')
    def validate_new_password(cls, v):
        if v:
            if len(v) < 8:
                raise ValueError('La contraseña debe tener al menos 8 caracteres')
            if not re.search(r'[A-Z]', v):
                raise ValueError('La contraseña debe contener al menos una mayúscula')
            if not re.search(r'[0-9]', v):
                raise ValueError('La contraseña debe contener al menos un número')
        return v

@router.put("/me")
def update_user_profile(
    req: UpdateProfileRequest,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza el perfil del usuario autenticado"""

    # Si quiere cambiar email, verificar que no esté en uso
    if req.email and req.email != current_user.email:
        existing_email = db.query(UserDB).filter(UserDB.email == req.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="El email ya está registrado")
        current_user.email = req.email

    # Actualizar WhatsApp
    if req.whatsapp_number is not None:
        current_user.whatsapp_number = req.whatsapp_number if req.whatsapp_number else None

    if req.whatsapp_notifications_enabled is not None:
        current_user.whatsapp_notifications_enabled = req.whatsapp_notifications_enabled

    # Cambiar contraseña (requiere contraseña actual)
    if req.new_password:
        if not req.current_password:
            raise HTTPException(status_code=400, detail="Debes proporcionar tu contraseña actual")

        if not verify_password(req.current_password, current_user.password_hash):
            raise HTTPException(status_code=401, detail="Contraseña actual incorrecta")

        current_user.password_hash = hash_password(req.new_password)

    db.commit()
    db.refresh(current_user)

    logging.info(f"✅ Perfil actualizado: {current_user.username}")

    return {
        "message": "Perfil actualizado exitosamente",
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "whatsapp_number": current_user.whatsapp_number,
            "whatsapp_notifications_enabled": current_user.whatsapp_notifications_enabled
        }
    }
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('La contraseña debe contener al menos una mayúscula')
        if not re.search(r'[0-9]', v):
            raise ValueError('La contraseña debe contener al menos un número')
        return v

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Restablece la contraseña usando el token de recuperación"""
    
    # Verificar token
    payload = verify_token(req.token)
    if not payload:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
        
    if payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Token inválido para restablecimiento")
        
    user_id = payload.get("user_id")
    user = db.query(UserDB).get(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    # Actualizar contraseña
    user.password_hash = hash_password(req.new_password)
    db.commit()
    
    logging.info(f"✅ Contraseña restablecida para: {user.username}")
    
    return {"message": "Contraseña restablecida exitosamente"}
