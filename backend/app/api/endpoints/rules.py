from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging

from app.db.session import SessionLocal
from app.models.all_models import RuleDB, RuleHitDB, UserDB
from app.api.endpoints.events import get_current_user # Reutilizar dependency

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
    new_rule = RuleDB(
        name=rule.get("name", "Regla sin nombre"),
        enabled=rule.get("enabled", True),
        camera=rule.get("camera"),
        label=rule.get("label"),
        frigate_type=rule.get("frigate_type"),
        min_score=rule.get("min_score"),
        min_duration_seconds=rule.get("min_duration_seconds"),
        custom_message=rule.get("custom_message"),
        time_start=rule.get("time_start"),
        time_end=rule.get("time_end"),
        user_id=current_user.id,
    )

    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    return {"status": "ok", "rule_id": new_rule.id}


@router.get("/")
def list_rules(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rules = (
        db.query(RuleDB)
        .filter(RuleDB.user_id == current_user.id)
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
    limit: int = 50,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rows = (
        db.query(RuleHitDB)
        .join(RuleDB, RuleHitDB.rule_id == RuleDB.id)
        .filter(RuleDB.user_id == current_user.id)
        .order_by(RuleHitDB.id.desc())
        .limit(limit)
        .all()
    )

    hits = []
    for h in rows:
        hits.append(
            {
                "id": h.id,
                "rule_id": h.rule_id,
                "event_id": h.event_id,
                "triggered_at": h.triggered_at.isoformat() + "Z",
                "action": h.action,
            }
        )

    return {"count": len(hits), "hits": hits}


@router.patch("/{rule_id}")
def update_rule(
    rule_id: int,
    data: Dict[str, Any],
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rule = db.query(RuleDB).filter(
        RuleDB.id == rule_id,
        RuleDB.user_id == current_user.id
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
    if "time_start" in data:
        rule.time_start = data["time_start"] if data["time_start"] else None
    if "time_end" in data:
        rule.time_end = data["time_end"] if data["time_end"] else None

    db.commit()
    db.refresh(rule)

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
    """Función interna para eliminar una regla (reutilizable)"""
    rule = db.query(RuleDB).filter(
        RuleDB.id == rule_id,
        RuleDB.user_id == current_user.id
    ).first()

    if not rule:
        logger.warning(f"Regla {rule_id} no encontrada para usuario {current_user.id}")
        raise HTTPException(status_code=404, detail="Rule not found")

    # Eliminar primero todos los hits asociados a esta regla
    hits_count = db.query(RuleHitDB).filter(RuleHitDB.rule_id == rule_id).count()
    if hits_count > 0:
        logger.info(f"Eliminando {hits_count} hits asociados a la regla {rule_id}")
        db.query(RuleHitDB).filter(RuleHitDB.rule_id == rule_id).delete()
    
    # Ahora eliminar la regla
    logger.info(f"Eliminando regla {rule_id}: {rule.name}")
    db.delete(rule)
    db.commit()

    logger.info(f"Regla {rule_id} eliminada exitosamente")
    return {"status": "ok", "message": f"Rule deleted successfully (removed {hits_count} associated hits)"}


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
