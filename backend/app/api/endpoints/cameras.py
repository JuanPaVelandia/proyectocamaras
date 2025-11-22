from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import logging

from app.db.session import SessionLocal
from app.api.endpoints.auth import get_current_user
from app.models.all_models import UserDB, CameraDB

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def list_cameras(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene la lista de cámaras desde la base de datos"""
    try:
        cameras = db.query(CameraDB).all()
        
        result = []
        for camera in cameras:
            result.append({
                "id": camera.id,
                "name": camera.name,
                "rtsp_url": camera.rtsp_url or "",
                "description": camera.description or "",
                "enabled": camera.enabled,
                "created_at": camera.created_at.isoformat() if camera.created_at else None
            })
        
        return {"cameras": result}
    except Exception as e:
        logger.error(f"Error listando cámaras: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
def add_camera(
    camera_data: Dict[str, Any],
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Agrega una nueva cámara a la base de datos"""
    try:
        name = camera_data.get("name", "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="El nombre de la cámara es obligatorio")
        
        # Validar que el nombre no tenga caracteres especiales
        if not name.replace("_", "").replace("-", "").isalnum():
            raise HTTPException(status_code=400, detail="El nombre solo puede contener letras, números, guiones y guiones bajos")
        
        # Verificar que la cámara no exista
        existing = db.query(CameraDB).filter(CameraDB.name == name).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"La cámara '{name}' ya existe")
        
        # Construir URL RTSP (opcional)
        ip = camera_data.get("ip", "").strip()
        port = camera_data.get("port", "554")
        username = camera_data.get("username", "").strip()
        password = camera_data.get("password", "").strip()
        stream_path = camera_data.get("stream_path", "/Streaming/Channels/101").strip()
        
        rtsp_url = None
        if ip:
            if username and password:
                rtsp_url = f"rtsp://{username}:{password}@{ip}:{port}{stream_path}"
            else:
                rtsp_url = f"rtsp://{ip}:{port}{stream_path}"
        
        # Crear cámara en BD
        new_camera = CameraDB(
            name=name,
            rtsp_url=rtsp_url,
            description=camera_data.get("description", ""),
            enabled=True,
            user_id=current_user.id
        )
        
        db.add(new_camera)
        db.commit()
        db.refresh(new_camera)
        
        logger.info(f"✅ Cámara '{name}' agregada a la base de datos por usuario {current_user.username}")
        
        return {
            "message": f"Cámara '{name}' agregada correctamente",
            "camera": {
                "id": new_camera.id,
                "name": new_camera.name,
                "rtsp_url": new_camera.rtsp_url or "",
                "enabled": new_camera.enabled
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error agregando cámara: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{camera_id}")
def delete_camera(
    camera_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina una cámara de la base de datos"""
    try:
        camera = db.query(CameraDB).filter(CameraDB.id == camera_id).first()
        
        if not camera:
            raise HTTPException(status_code=404, detail="Cámara no encontrada")
        
        camera_name = camera.name
        db.delete(camera)
        db.commit()
        
        logger.info(f"🗑️ Cámara '{camera_name}' eliminada por usuario {current_user.username}")
        
        return {"message": f"Cámara '{camera_name}' eliminada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando cámara: {e}")
        raise HTTPException(status_code=500, detail=str(e))
