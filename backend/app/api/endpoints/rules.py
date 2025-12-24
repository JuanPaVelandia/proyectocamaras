from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import logging
import json

from app.db.session import SessionLocal
from app.models.all_models import RuleDB, RuleHitDB, UserDB, EventDB
from app.api.endpoints.events import get_current_user # Reutilizar dependency
from app.utils.timezone_utils import convert_local_time_to_utc

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def create_rule(
    rule: Dict[str, Any],
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Obtener timezone del usuario (default: UTC)
    user_timezone = current_user.timezone or "UTC"
    
    # Convertir horas de la zona horaria del usuario a UTC
    time_start = rule.get("time_start")
    time_end = rule.get("time_end")
    
    if time_start:
        time_start = convert_local_time_to_utc(time_start, user_timezone)
    if time_end:
        time_end = convert_local_time_to_utc(time_end, user_timezone)
    
    new_rule = RuleDB(
        name=rule.get("name", "Regla sin nombre"),
        enabled=rule.get("enabled", True),
        camera=rule.get("camera"),
        label=rule.get("label"),
        frigate_type=rule.get("frigate_type"),
        min_score=rule.get("min_score"),
        min_duration_seconds=rule.get("min_duration_seconds"),
        custom_message=rule.get("custom_message"),
        time_start=time_start,
        time_end=time_end,
        user_id=current_user.id,
    )

    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    logging.info(f"✅ Regla creada: {new_rule.name} (horas convertidas de {user_timezone} a UTC: {time_start} - {time_end})")
    
    return {"status": "ok", "rule_id": new_rule.id}


@router.get("/")
def list_rules(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rules = (
        db.query(RuleDB)
        .filter(
            RuleDB.user_id == current_user.id,
            RuleDB.is_deleted == False
        )
        .order_by(RuleDB.id.asc())
        .all()
    )

    result = []
    for r in rules:
        result.append(
            {
                "id": r.id,
                "name": r.name,
                "enabled": r.enabled,
                "camera": r.camera,
                "label": r.label,
                "frigate_type": r.frigate_type,
                "min_score": r.min_score,
                "min_duration_seconds": r.min_duration_seconds,
                "custom_message": r.custom_message,
                "time_start": r.time_start,
                "time_end": r.time_end,
                "created_at": r.created_at.isoformat() + "Z",
            }
        )

    return {"count": len(result), "rules": result}


@router.get("/hits")
def list_rule_hits(
    page: int = 1,
    page_size: int = 20,
    camera: List[str] = Query(None),
    label: List[str] = Query(None),
    start_date: str | None = None,
    end_date: str | None = None,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Query Base
    query = (
        db.query(RuleHitDB)
        .join(RuleDB, RuleHitDB.rule_id == RuleDB.id)
        .filter(RuleDB.user_id == current_user.id)
    )

    # Filters
    if camera:
        query = query.filter(RuleDB.camera.in_(camera))
    
    if label:
        # Para búsqueda case-insensitive en lista, tendríamos que iterar o usar ILIKE ANY (Postgres)
        # SQLite no soporta ILIKE ANY fácilmente.
        # Asumiremos coincidencia exacta para multi-select, o usaremos un workaround.
        # Dado que los valores vienen de un dropdown, la coincidencia exacta es preferible/segura.
        query = query.filter(RuleDB.label.in_(label))

    user_timezone = current_user.timezone or "UTC"

    if start_date:
        try:
            # El frontend envía datetime-local (YYYY-MM-DDTHH:MM) sin info de zona horaria.
            # Interpretamos esa fecha como la HORA LOCAL del usuario.
            # Convertimos esa hora local -> UTC para comparar con la DB.
            dt_local_str = start_date.replace("Z", "") # Limpieza por si acaso
            # convert_local_time_to_utc devuelve un objeto time (HH:MM), pero aquí necesitamos datetime completo.
            # No podemos usar esa función directamente porque es para horas simples.
            # Haremos la conversión manual aquí usando pytz o similar si estuviera, 
            # pero dado que convert_local_time_to_utc usa una lógica manual simple, haremos algo parecido.
            
            # Simple approach: Parse naive (Local) -> Attach User TZ -> Convert to UTC -> Remove TZ info (make naive UTC)
            from app.utils.timezone_utils import pytz
            local_tz = pytz.timezone(user_timezone)
            
            # Parsear string naive
            dt_naive = datetime.fromisoformat(dt_local_str)
            # Asignar zona horaria del usuario
            dt_local = local_tz.localize(dt_naive)
            # Convertir a UTC
            dt_utc = dt_local.astimezone(pytz.UTC)
            # Hacerlo naive de nuevo para comparar con SQLAlchemy (si el campo es naive)
            dt_query = dt_utc.replace(tzinfo=None)

            query = query.filter(RuleHitDB.triggered_at >= dt_query)
        except Exception as e:
            logger.error(f"Error parsing start_date: {e}")
            pass

    if end_date:
        try:
            dt_local_str = end_date.replace("Z", "")
            from app.utils.timezone_utils import pytz
            local_tz = pytz.timezone(user_timezone)
            
            dt_naive = datetime.fromisoformat(dt_local_str)
            dt_local = local_tz.localize(dt_naive)
            dt_utc = dt_local.astimezone(pytz.UTC)
            dt_query = dt_utc.replace(tzinfo=None)

            query = query.filter(RuleHitDB.triggered_at <= dt_query)
        except Exception as e:
            logger.error(f"Error parsing end_date: {e}")
            pass

    # Total count (antes de paginacion)
    total_count = query.count()
    total_pages = (total_count + page_size - 1) // page_size

    # Order and Pagination
    rows = (
        query
        .order_by(RuleHitDB.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Get distinct available options for filter dropdowns
    # Cameras
    distinct_cameras_rows = (
        db.query(RuleDB.camera)
        .join(RuleHitDB, RuleHitDB.rule_id == RuleDB.id)
        .filter(RuleDB.user_id == current_user.id)
        .distinct()
        .all()
    )
    unique_cameras = sorted([r[0] for r in distinct_cameras_rows if r[0]])

    # Labels
    distinct_labels_rows = (
        db.query(RuleDB.label)
        .join(RuleHitDB, RuleHitDB.rule_id == RuleDB.id)
        .filter(RuleDB.user_id == current_user.id)
        .distinct()
        .all()
    )
    unique_labels = sorted([r[0] for r in distinct_labels_rows if r[0]])

    hits = []
    for h in rows:
        # Obtener información del evento asociado
        event_data = None
        snapshot_base64 = None
        if h.event:
            try:
                event_payload = json.loads(h.event.payload)
                event_data = {
                    "camera": event_payload.get("camera"),
                    "label": event_payload.get("label"),
                    "score": event_payload.get("score") or event_payload.get("top_score"),
                    "frigate_type": event_payload.get("frigate_type"),
                }
                snapshot_base64 = h.event.snapshot_base64
            except Exception as e:
                logger.error(f"Error parseando evento {h.event_id}: {e}")

        # Obtener nombre de la regla
        rule_name = h.rule.name if h.rule else "Desconocida"

        hits.append(
            {
                "id": h.id,
                "rule_id": h.rule_id,
                "rule_name": rule_name,
                "event_id": h.event_id,
                "event_data": event_data,
                "snapshot_base64": snapshot_base64,
                "triggered_at": h.triggered_at.isoformat() + "Z",
                "action": h.action,
            }
        )

    return {
        "hits": hits,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "cameras": unique_cameras,
        "labels": unique_labels
    }


@router.patch("/{rule_id}")
def update_rule(
    rule_id: int,
    data: Dict[str, Any],
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rule = db.query(RuleDB).filter(
        RuleDB.id == rule_id,
        RuleDB.user_id == current_user.id,
        RuleDB.is_deleted == False
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Permitir actualizar todos los campos
    if "name" in data:
        rule.name = data["name"]
    if "enabled" in data:
        rule.enabled = bool(data["enabled"])
    if "camera" in data:
        rule.camera = data["camera"] if data["camera"] else None
    if "label" in data:
        rule.label = data["label"] if data["label"] else None
    if "frigate_type" in data:
        rule.frigate_type = data["frigate_type"] if data["frigate_type"] else None
    if "min_score" in data:
        rule.min_score = float(data["min_score"]) if data["min_score"] else None
    if "min_duration_seconds" in data:
        rule.min_duration_seconds = float(data["min_duration_seconds"]) if data["min_duration_seconds"] else None
    if "custom_message" in data:
        rule.custom_message = data["custom_message"] if data["custom_message"] else None
    
    # Convertir horas de la zona horaria del usuario a UTC
    user_timezone = current_user.timezone or "UTC"
    if "time_start" in data:
        if data["time_start"]:
            rule.time_start = convert_local_time_to_utc(data["time_start"], user_timezone)
        else:
            rule.time_start = None
    if "time_end" in data:
        if data["time_end"]:
            rule.time_end = convert_local_time_to_utc(data["time_end"], user_timezone)
        else:
            rule.time_end = None

    db.commit()
    db.refresh(rule)
    
    logging.info(f"✅ Regla actualizada: {rule.name} (horas convertidas de {user_timezone} a UTC)")

    return {
        "status": "ok",
        "rule": {
            "id": rule.id,
            "name": rule.name,
            "enabled": rule.enabled,
            "camera": rule.camera,
            "label": rule.label,
            "frigate_type": rule.frigate_type,
            "min_score": rule.min_score,
            "min_duration_seconds": rule.min_duration_seconds,
            "custom_message": rule.custom_message,
            "time_start": rule.time_start,
            "time_end": rule.time_end,
        },
    }


def _delete_rule_internal(rule_id: int, current_user: UserDB, db: Session):
    """Función interna para eliminar una regla (SOFT DELETE)"""
    rule = db.query(RuleDB).filter(
        RuleDB.id == rule_id,
        RuleDB.user_id == current_user.id
    ).first()

    if not rule:
        logger.warning(f"Regla {rule_id} no encontrada para usuario {current_user.id}")
        raise HTTPException(status_code=404, detail="Rule not found")

    # SOFT DELETE: Marcar como eliminada y deshabilitar
    rule.is_deleted = True
    rule.enabled = False
    
    db.commit()

    logger.info(f"Regla {rule_id} marcada como eliminada (Soft Delete)")
    return {"status": "ok", "message": "Rule deleted successfully (Soft Delete)"}


@router.delete("/{rule_id}")
def delete_rule(
    rule_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"DELETE request recibido para regla ID: {rule_id} por usuario: {current_user.username}")
    return _delete_rule_internal(rule_id, current_user, db)


@router.post("/{rule_id}/delete")
def delete_rule_post(
    rule_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Endpoint alternativo usando POST para eliminar reglas (workaround)"""
    logger.info(f"POST /delete request recibido para regla ID: {rule_id} por usuario: {current_user.username}")
    return _delete_rule_internal(rule_id, current_user, db)
