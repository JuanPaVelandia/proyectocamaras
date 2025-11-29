from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import logging
import yaml
import os
import subprocess
import json

from app.db.session import SessionLocal
from app.api.endpoints.auth import get_current_user
from app.models.all_models import UserDB, CameraDB, EventDB
from app.api.endpoints import events as events_module

router = APIRouter()
logger = logging.getLogger(__name__)

CONFIG_PATH = "/config/config.yml"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def add_camera_to_frigate_config(name: str, rtsp_url: str) -> bool:
    """Agrega una cámara a la configuración de Frigate"""
    try:
        # Leer config.yml actual
        with open(CONFIG_PATH, 'r') as f:
            config = yaml.safe_load(f)

        # Verificar si ya existe
        if 'cameras' not in config:
            config['cameras'] = {}

        if name in config['cameras']:
            logger.warning(f"Cámara '{name}' ya existe en config.yml")
            return True

        # Agregar nueva cámara con configuración por defecto
        config['cameras'][name] = {
            'ffmpeg': {
                'inputs': [
                    {
                        'path': rtsp_url,
                        'roles': ['detect', 'record']
                    }
                ]
            },
            'detect': {
                'width': 1920,
                'height': 1080,
                'fps': 5
            },
            'record': {
                'enabled': True,
                'retain': {
                    'days': 1,
                    'mode': 'motion'
                }
            },
            'snapshots': {
                'enabled': True,
                'timestamp': True,
                'bounding_box': True,
                'retain': {
                    'default': 1
                }
            }
        }

        # Escribir de vuelta a config.yml
        with open(CONFIG_PATH, 'w') as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)

        logger.info(f"✅ Cámara '{name}' agregada a config.yml")
        return True

    except Exception as e:
        logger.error(f"Error agregando cámara a config.yml: {e}")
        return False

def remove_camera_from_frigate_config(name: str) -> bool:
    """Elimina una cámara de la configuración de Frigate"""
    try:
        with open(CONFIG_PATH, 'r') as f:
            config = yaml.safe_load(f)

        if 'cameras' in config and name in config['cameras']:
            del config['cameras'][name]

            with open(CONFIG_PATH, 'w') as f:
                yaml.dump(config, f, default_flow_style=False, sort_keys=False)

            logger.info(f"✅ Cámara '{name}' eliminada de config.yml")
            return True
        else:
            logger.warning(f"Cámara '{name}' no encontrada en config.yml")
            return True

    except Exception as e:
        logger.error(f"Error eliminando cámara de config.yml: {e}")
        return False

def restart_frigate() -> bool:
    """Reinicia el contenedor de Frigate"""
    try:
        # Usar docker-compose restart desde el directorio del proyecto
        result = subprocess.run(
            ["docker-compose", "restart", "frigate"],
            cwd="/home/usuario/proyectocamaras",
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            logger.info("✅ Frigate reiniciado correctamente")
            return True
        else:
            logger.error(f"Error reiniciando Frigate: {result.stderr}")
            return False

    except Exception as e:
        logger.error(f"Error ejecutando restart de Frigate: {e}")
        return False

@router.get("/")
def list_cameras(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene la lista de cámaras del usuario autenticado con último snapshot"""
    try:
        # FILTRAR SOLO CÁMARAS DEL USUARIO ACTUAL
        cameras = db.query(CameraDB).filter(CameraDB.user_id == current_user.id).all()

        result = []
        for camera in cameras:
            # Buscar el último evento con snapshot de esta cámara usando SQL directo (más rápido)
            last_snapshot = None
            last_event_time = None

            # Query SQL optimizado con LIKE en lugar de parsear JSON
            last_event = (
                db.query(EventDB)
                .filter(
                    EventDB.snapshot_base64.isnot(None),
                    EventDB.payload.like(f'%"camera": "{camera.name}"%')
                )
                .order_by(EventDB.id.desc())
                .first()  # Solo necesitamos el primero
            )

            if last_event:
                last_snapshot = last_event.snapshot_base64
                last_event_time = last_event.received_at.isoformat() if last_event.received_at else None

            result.append({
                "id": camera.id,
                "name": camera.name,
                "rtsp_url": camera.rtsp_url or "",
                "description": camera.description or "",
                "enabled": camera.enabled,
                "created_at": camera.created_at.isoformat() if camera.created_at else None,
                "last_snapshot": last_snapshot,
                "last_event_time": last_event_time
            })

        logger.info(f"🔒 Usuario {current_user.username} consultó sus {len(result)} cámaras.")
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
    """Agrega una nueva cámara a la base de datos y a Frigate"""
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

        # Agregar a Frigate config.yml si tiene URL RTSP
        frigate_added = False
        frigate_restarted = False

        if rtsp_url:
            frigate_added = add_camera_to_frigate_config(name, rtsp_url)
            if frigate_added:
                frigate_restarted = restart_frigate()

        return {
            "message": f"Cámara '{name}' agregada correctamente",
            "camera": {
                "id": new_camera.id,
                "name": new_camera.name,
                "rtsp_url": new_camera.rtsp_url or "",
                "enabled": new_camera.enabled
            },
            "frigate_status": {
                "added_to_config": frigate_added,
                "restarted": frigate_restarted
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
    """Elimina una cámara de la base de datos y de Frigate (solo si pertenece al usuario)"""
    try:
        # VERIFICAR QUE LA CÁMARA PERTENECE AL USUARIO
        camera = db.query(CameraDB).filter(
            CameraDB.id == camera_id,
            CameraDB.user_id == current_user.id
        ).first()

        if not camera:
            raise HTTPException(status_code=404, detail="Cámara no encontrada o no tienes permisos")

        camera_name = camera.name

        # Eliminar de Frigate config
        remove_camera_from_frigate_config(camera_name)

        # Eliminar de BD
        db.delete(camera)
        db.commit()

        # Reiniciar Frigate
        restart_frigate()

        logger.info(f"🗑️ Cámara '{camera_name}' eliminada por usuario {current_user.username}")

        return {"message": f"Cámara '{camera_name}' eliminada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando cámara: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/restart-frigate")
def restart_frigate_endpoint(
    current_user: UserDB = Depends(get_current_user)
):
    """Reinicia el contenedor de Frigate (requiere autenticación)"""
    try:
        success = restart_frigate()

        if success:
            return {"message": "Frigate reiniciado correctamente"}
        else:
            raise HTTPException(status_code=500, detail="Error reiniciando Frigate")

    except Exception as e:
        logger.error(f"Error en endpoint restart-frigate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ingest-mapping")
def get_ingest_mapping(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db)
):
    """
    Public mapping endpoint for ingest clients (python-listener).
    Auth: Authorization: Bearer <API_KEY> (same as /api/events/)
    Returns list of cameras with name and rtsp_url.
    """
    expected = getattr(events_module, "EXPECTED_API_KEY", None)
    if expected:
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        try:
            scheme, token = authorization.split()
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid Authorization header")
        if scheme.lower() != "bearer" or token != expected:
            raise HTTPException(status_code=401, detail="Invalid API key")

    rows = db.query(CameraDB).filter(CameraDB.enabled == True).all()
    return {
        "cameras": [
            {
                "id": c.id,
                "name": c.name,
                "rtsp_url": c.rtsp_url or "",
            }
            for c in rows
        ]
    }
