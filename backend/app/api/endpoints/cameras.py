from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import yaml
import os
import logging
from pathlib import Path

from app.db.session import SessionLocal
from app.api.endpoints.events import get_current_user
from app.models.all_models import UserDB

router = APIRouter()
logger = logging.getLogger(__name__)

# Ruta al archivo de configuración de Frigate
# En Docker: /config/config.yml (montado desde ./config/config.yml)
# En desarrollo local: puede ser relativo
FRIGATE_CONFIG_PATH = os.getenv("FRIGATE_CONFIG_PATH", "/config/config.yml")

def get_config_path():
    """Obtiene la ruta correcta al archivo de configuración"""
    # Primero intentar la ruta de la variable de entorno
    config_path = Path(FRIGATE_CONFIG_PATH)
    if config_path.exists():
        return config_path.resolve()
    
    # Si no existe, intentar ruta relativa (desarrollo local)
    relative_path = Path(__file__).parent.parent.parent.parent.parent / "config" / "config.yml"
    if relative_path.exists():
        return relative_path.resolve()
    
    # Si tampoco existe, usar la ruta de la variable de entorno (Docker)
    return Path(FRIGATE_CONFIG_PATH)

FRIGATE_CONFIG_ABSOLUTE = get_config_path()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def load_frigate_config():
    """Carga la configuración de Frigate desde el archivo YAML"""
    try:
        with open(FRIGATE_CONFIG_ABSOLUTE, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Error cargando config de Frigate: {e}")
        return {}

def save_frigate_config(config: dict):
    """Guarda la configuración de Frigate al archivo YAML"""
    try:
        # Asegurar que el directorio existe
        FRIGATE_CONFIG_ABSOLUTE.parent.mkdir(parents=True, exist_ok=True)
        
        with open(FRIGATE_CONFIG_ABSOLUTE, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
        return True
    except Exception as e:
        logger.error(f"Error guardando config de Frigate: {e}")
        return False

@router.get("/")
def list_cameras(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene la lista de cámaras configuradas en Frigate"""
    try:
        config = load_frigate_config()
        cameras = config.get("cameras", {})
        
        result = []
        for name, camera_config in cameras.items():
            # Extraer información básica
            inputs = camera_config.get("ffmpeg", {}).get("inputs", [])
            rtsp_url = inputs[0].get("path", "") if inputs else ""
            
            result.append({
                "name": name,
                "rtsp_url": rtsp_url,
                "detect": camera_config.get("detect", {}),
                "record": camera_config.get("record", {}),
                "snapshots": camera_config.get("snapshots", {}),
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
    """Agrega una nueva cámara a la configuración de Frigate"""
    try:
        name = camera_data.get("name", "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="El nombre de la cámara es obligatorio")
        
        # Validar que el nombre no tenga caracteres especiales
        if not name.replace("_", "").replace("-", "").isalnum():
            raise HTTPException(status_code=400, detail="El nombre solo puede contener letras, números, guiones y guiones bajos")
        
        # Cargar configuración actual
        config = load_frigate_config()
        
        # Verificar que la cámara no exista
        if "cameras" in config and name in config["cameras"]:
            raise HTTPException(status_code=400, detail=f"La cámara '{name}' ya existe")
        
        # Construir URL RTSP
        ip = camera_data.get("ip", "").strip()
        port = camera_data.get("port", "554")
        username = camera_data.get("username", "").strip()
        password = camera_data.get("password", "").strip()
        stream_path = camera_data.get("stream_path", "/Streaming/Channels/101").strip()
        
        if not ip:
            raise HTTPException(status_code=400, detail="La IP de la cámara es obligatoria")
        
        # Construir RTSP URL
        if username and password:
            rtsp_url = f"rtsp://{username}:{password}@{ip}:{port}{stream_path}"
        else:
            rtsp_url = f"rtsp://{ip}:{port}{stream_path}"
        
        # Configuración de la cámara
        camera_config = {
            "ffmpeg": {
                "inputs": [
                    {
                        "path": rtsp_url,
                        "roles": ["detect", "record"]
                    }
                ]
            },
            "detect": {
                "width": camera_data.get("width", 1920),
                "height": camera_data.get("height", 1080),
                "fps": camera_data.get("fps", 5)
            },
            "record": {
                "enabled": camera_data.get("record_enabled", True),
                "retain": {
                    "days": camera_data.get("retain_days", 1),
                    "mode": "motion"
                }
            },
            "snapshots": {
                "enabled": True,
                "timestamp": True,
                "bounding_box": True,
                "retain": {
                    "default": 1
                }
            }
        }
        
        # Inicializar sección de cámaras si no existe
        if "cameras" not in config:
            config["cameras"] = {}
        
        # Agregar cámara
        config["cameras"][name] = camera_config
        
        # Guardar configuración
        if not save_frigate_config(config):
            raise HTTPException(status_code=500, detail="Error guardando configuración")
        
        logger.info(f"Cámara '{name}' agregada por usuario {current_user.username}")
        
        return {
            "status": "ok",
            "message": f"Cámara '{name}' agregada correctamente",
            "camera": {
                "name": name,
                "rtsp_url": rtsp_url
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error agregando cámara: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{camera_name}")
def delete_camera(
    camera_name: str,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina una cámara de la configuración de Frigate"""
    try:
        config = load_frigate_config()
        
        if "cameras" not in config or camera_name not in config["cameras"]:
            raise HTTPException(status_code=404, detail=f"Cámara '{camera_name}' no encontrada")
        
        # Eliminar cámara
        del config["cameras"][camera_name]
        
        # Guardar configuración
        if not save_frigate_config(config):
            raise HTTPException(status_code=500, detail="Error guardando configuración")
        
        logger.info(f"Cámara '{camera_name}' eliminada por usuario {current_user.username}")
        
        return {
            "status": "ok",
            "message": f"Cámara '{camera_name}' eliminada correctamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando cámara: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/restart-frigate")
def restart_frigate(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reinicia Frigate para aplicar cambios de configuración"""
    try:
        import subprocess
        # Reiniciar contenedor de Frigate
        result = subprocess.run(
            ["docker", "restart", "frigate"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            logger.info(f"Frigate reiniciado por usuario {current_user.username}")
            return {
                "status": "ok",
                "message": "Frigate reiniciado correctamente"
            }
        else:
            logger.warning(f"Error reiniciando Frigate: {result.stderr}")
            return {
                "status": "warning",
                "message": "Frigate puede no haberse reiniciado. Reinicia manualmente con: docker restart frigate"
            }
    except FileNotFoundError:
        logger.warning("Docker no encontrado, el usuario debe reiniciar manualmente")
        return {
            "status": "warning",
            "message": "Docker no encontrado. Reinicia Frigate manualmente con: docker restart frigate"
        }
    except Exception as e:
        logger.error(f"Error reiniciando Frigate: {e}")
        return {
            "status": "error",
            "message": f"Error: {str(e)}. Reinicia manualmente con: docker restart frigate"
        }

