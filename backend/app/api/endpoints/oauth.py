from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
import logging
import os
from urllib.parse import urlencode

from app.db.session import SessionLocal
from app.models.all_models import UserDB
from app.core.security import create_access_token
from authlib.integrations.starlette_client import OAuth, OAuthError

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Configuración OAuth
oauth = OAuth()

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name='google',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )

# Facebook OAuth
FACEBOOK_CLIENT_ID = os.getenv("FACEBOOK_CLIENT_ID", "")
FACEBOOK_CLIENT_SECRET = os.getenv("FACEBOOK_CLIENT_SECRET", "")
FACEBOOK_REDIRECT_URI = os.getenv("FACEBOOK_REDIRECT_URI", "http://localhost:8000/api/auth/facebook/callback")

if FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET:
    oauth.register(
        name='facebook',
        client_id=FACEBOOK_CLIENT_ID,
        client_secret=FACEBOOK_CLIENT_SECRET,
        client_kwargs={
            'scope': 'email public_profile'
        },
        authorize_url='https://www.facebook.com/v18.0/dialog/oauth',
        access_token_url='https://graph.facebook.com/v18.0/oauth/access_token',
        api_base_url='https://graph.facebook.com/',
    )

def get_or_create_oauth_user(
    db: Session,
    provider: str,
    oauth_id: str,
    email: Optional[str] = None,
    name: Optional[str] = None,
    avatar: Optional[str] = None
) -> UserDB:
    """Obtiene o crea un usuario OAuth"""
    # Buscar usuario existente por provider + oauth_id
    user = db.query(UserDB).filter(
        UserDB.oauth_provider == provider,
        UserDB.oauth_id == oauth_id
    ).first()
    
    if user:
        # Actualizar información si cambió
        if email and not user.email:
            user.email = email
        if name and not user.full_name:
            user.full_name = name
        if avatar and not user.avatar_url:
            user.avatar_url = avatar
        db.commit()
        return user
    
    # Si no existe, buscar por email (puede ser que se registró con otro método)
    if email:
        user = db.query(UserDB).filter(UserDB.email == email).first()
        if user:
            # Actualizar con información OAuth
            user.oauth_provider = provider
            user.oauth_id = oauth_id
            if name:
                user.full_name = name
            if avatar:
                user.avatar_url = avatar
            db.commit()
            return user
    
    # Crear nuevo usuario
    username = email.split('@')[0] if email else f"{provider}_{oauth_id}"
    # Asegurar que el username sea único
    base_username = username
    counter = 1
    while db.query(UserDB).filter(UserDB.username == username).first():
        username = f"{base_username}_{counter}"
        counter += 1
    
    user = UserDB(
        username=username,
        oauth_provider=provider,
        oauth_id=oauth_id,
        email=email,
        full_name=name,
        avatar_url=avatar,
        password_hash=None  # No tiene contraseña
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info(f"✅ Usuario OAuth creado: {user.username} ({provider})")
    return user

@router.get("/google")
async def google_login(request: Request):
    """Inicia el flujo de login con Google"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth no está configurado. Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env"
        )
    
    redirect_uri = str(request.url).replace('/google', '/google/callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Callback de Google OAuth"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            # Si no viene en token, obtener de Google
            resp = await oauth.google.get('https://www.googleapis.com/oauth2/v2/userinfo', token=token)
            user_info = resp.json()
        
        oauth_id = user_info.get('sub') or user_info.get('id')
        email = user_info.get('email')
        name = user_info.get('name')
        picture = user_info.get('picture')
        
        if not oauth_id:
            raise HTTPException(status_code=400, detail="No se pudo obtener información del usuario")
        
        # Obtener o crear usuario
        user = get_or_create_oauth_user(
            db=db,
            provider='google',
            oauth_id=oauth_id,
            email=email,
            name=name,
            avatar=picture
        )
        
        # Crear JWT token
        jwt_token = create_access_token(data={"user_id": user.id, "username": user.username})
        
        # Redirigir al frontend con el token
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        redirect_url = f"{frontend_url}/auth/callback?token={jwt_token}&username={user.username}"
        
        return RedirectResponse(url=redirect_url)
        
    except OAuthError as e:
        logger.error(f"Error OAuth Google: {e}")
        raise HTTPException(status_code=400, detail=f"Error en autenticación Google: {str(e)}")
    except Exception as e:
        logger.error(f"Error en callback Google: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando autenticación: {str(e)}")

@router.get("/facebook")
async def facebook_login(request: Request):
    """Inicia el flujo de login con Facebook"""
    if not FACEBOOK_CLIENT_ID or not FACEBOOK_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Facebook OAuth no está configurado. Configura FACEBOOK_CLIENT_ID y FACEBOOK_CLIENT_SECRET en .env"
        )
    
    redirect_uri = str(request.url).replace('/facebook', '/facebook/callback')
    return await oauth.facebook.authorize_redirect(request, redirect_uri)

@router.get("/facebook/callback")
async def facebook_callback(request: Request, db: Session = Depends(get_db)):
    """Callback de Facebook OAuth"""
    try:
        token = await oauth.facebook.authorize_access_token(request)
        
        # Obtener información del usuario de Facebook
        resp = await oauth.facebook.get(
            'https://graph.facebook.com/me',
            token=token,
            params={'fields': 'id,name,email,picture'}
        )
        user_info = resp.json()
        
        oauth_id = user_info.get('id')
        email = user_info.get('email')
        name = user_info.get('name')
        picture = user_info.get('picture', {}).get('data', {}).get('url') if user_info.get('picture') else None
        
        if not oauth_id:
            raise HTTPException(status_code=400, detail="No se pudo obtener información del usuario")
        
        # Obtener o crear usuario
        user = get_or_create_oauth_user(
            db=db,
            provider='facebook',
            oauth_id=oauth_id,
            email=email,
            name=name,
            avatar=picture
        )
        
        # Crear JWT token
        jwt_token = create_access_token(data={"user_id": user.id, "username": user.username})
        
        # Redirigir al frontend con el token
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        redirect_url = f"{frontend_url}/auth/callback?token={jwt_token}&username={user.username}"
        
        return RedirectResponse(url=redirect_url)
        
    except OAuthError as e:
        logger.error(f"Error OAuth Facebook: {e}")
        raise HTTPException(status_code=400, detail=f"Error en autenticación Facebook: {str(e)}")
    except Exception as e:
        logger.error(f"Error en callback Facebook: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando autenticación: {str(e)}")

@router.get("/providers")
async def get_oauth_providers():
    """Retorna los proveedores OAuth disponibles"""
    providers = []
    
    if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
        providers.append({
            "name": "google",
            "display_name": "Google",
            "login_url": "/api/auth/google"
        })
    
    if FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET:
        providers.append({
            "name": "facebook",
            "display_name": "Facebook",
            "login_url": "/api/auth/facebook"
        })
    
    return {"providers": providers}

