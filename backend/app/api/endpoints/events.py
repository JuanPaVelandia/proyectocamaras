from fastapi import APIRouter, Request, Header, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
import json
import logging
import os
from datetime import datetime

from app.db.session import SessionLocal
from app.models.all_models import EventDB, UserDB
from app.services.rule_engine import evaluate_rules
from app.api.endpoints.auth import get_current_user

router = APIRouter()

# SECURITY FIX: Use env var for API Key
EXPECTED_API_KEY = os.getenv("API_SECRET_KEY")
EVENTS_IN_MEMORY: List[Dict[str, Any]] = []


#Este bloque prepara al router, le define una contrase, cuelga una pizarra borrable
#y contrata un bibliotecario efeiciente que se asegura que nadie se robe los libros de la bd
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
async def receive_event(
    request: Request,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None)
):
    if EXPECTED_API_KEY:
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        try:
            scheme, token = authorization.split()
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid Authorization header")

        if scheme.lower() != "bearer" or token != EXPECTED_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")

    body = await request.json()

    # TEMPORAL: Validación deshabilitada para testing
    # TODO: Reactivar después de las pruebas
    # from app.models.all_models import CameraDB
    # camera_name = body.get("camera")
    #
    # db_check = SessionLocal()
    # try:
    #     camera = db_check.query(CameraDB).filter(
    #         CameraDB.name == camera_name,
    #         CameraDB.enabled == True
    #     ).first()
    #
    #     if not camera:
    #         logging.warning(f"🚫 Evento ignorado: Cámara '{camera_name}' no existe en la base de datos o está deshabilitada.")
    #         return {"status": "ignored", "reason": "camera_not_in_database"}
    # finally:
    #     db_check.close()

    logging.info(f"📨 Evento recibido en backend: {body.get('type')} - {body.get('label')}")

    now = datetime.utcnow()

    wrapped_event = {
        "received_at": now.isoformat() + "Z",
        "event": body,
    }
    
    EVENTS_IN_MEMORY.append(wrapped_event)
    
    # MEMORY FIX: Limit memory usage
    if len(EVENTS_IN_MEMORY) >= 500:
        EVENTS_IN_MEMORY.pop(0) 

    # Extraer snapshot_base64 si viene en el body
    snapshot_b64 = body.pop('snapshot_base64', None)

    # DB FIX: Only save 'end' events to DB (PostgreSQL)
    # 'new' and 'update' are kept in RAM only for live view
    if body.get('type') == 'end':
        db = SessionLocal()
        try:
            db_event = EventDB(
                received_at=now,
                payload=json.dumps(body),
                snapshot_base64=snapshot_b64
            )
            db.add(db_event)
            db.commit()
            db.refresh(db_event)

            # CONCURRENCY: Offload rule evaluation to background task
            background_tasks.add_task(evaluate_rules, body, db_event.id)

        except Exception as e:
            logging.error(f"❌ Error guardando evento o evaluando reglas: {e}")
            raise HTTPException(status_code=500, detail=f"Error saving event: {str(e)}")
        finally:
            db.close()
    else:
        # For 'new'/'update', we don't save to DB and don't trigger rules (no DB ID)
        pass

    return {"status": "ok", "stored": body.get('type') == 'end'}


@router.get("/")
def list_events(
    limit: int = 50,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista eventos en memoria filtrados por cámaras del usuario autenticado"""
    from app.models.all_models import CameraDB

    # Obtener cámaras del usuario
    user_cameras = db.query(CameraDB).filter(CameraDB.user_id == current_user.id).all()
    user_camera_names = {cam.name for cam in user_cameras}

    if limit <= 0:
        limit = 50

    # Filtrar eventos solo de cámaras del usuario
    filtered_events = [
        event for event in EVENTS_IN_MEMORY
        if event.get("event", {}).get("camera") in user_camera_names
    ]

    result = filtered_events[-limit:]
    return {"count": len(result), "events": result}


@router.get("/db")
def list_events_db(
    limit: int = 50,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista eventos de la BD filtrados por cámaras del usuario autenticado"""
    from app.models.all_models import CameraDB

    # Obtener cámaras del usuario
    user_cameras = db.query(CameraDB).filter(CameraDB.user_id == current_user.id).all()
    user_camera_names = {cam.name for cam in user_cameras}

    # Si el usuario no tiene cámaras, retornar vacío
    if not user_camera_names:
        logging.info(f"🔍 Usuario {current_user.username} no tiene cámaras asignadas.")
        return {"count": 0, "events": []}

    rows = (
        db.query(EventDB)
        .order_by(EventDB.id.desc())
        .limit(limit * 3)  # Buscar más para compensar el filtrado
        .all()
    )

    events = []
    for row in rows:
        payload = json.loads(row.payload)
        camera_name = payload.get("camera")

        # Solo incluir eventos de cámaras del usuario
        if camera_name in user_camera_names:
            events.append(
                {
                    "id": row.id,
                    "received_at": row.received_at.isoformat() + "Z",
                    "event": payload,
                    "snapshot_base64": row.snapshot_base64,  # Incluir snapshot para mostrar en frontend
                }
            )

        # Detener si alcanzamos el límite
        if len(events) >= limit:
            break

    logging.info(f"🔍 Consulta DB por usuario {current_user.username}: {len(events)} eventos filtrados de {len(rows)} totales.")

    return {"count": len(events), "events": events}
