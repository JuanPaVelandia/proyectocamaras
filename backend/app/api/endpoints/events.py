from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
import json
import logging
from datetime import datetime

from app.db.session import SessionLocal
from app.models.all_models import EventDB, UserDB
from app.services.rule_engine import evaluate_rules
from app.api.endpoints.auth import get_current_user

router = APIRouter()

EXPECTED_API_KEY = "super-token-secreto"
EVENTS_IN_MEMORY: List[Dict[str, Any]] = []

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
async def receive_event(
    request: Request,
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
    logging.info(f"📨 Evento recibido en backend: {body}")

    now = datetime.utcnow()

    wrapped_event = {
        "received_at": now.isoformat() + "Z",
        "event": body,
    }
    EVENTS_IN_MEMORY.append(wrapped_event)

    db = SessionLocal()
    try:
        db_event = EventDB(
            received_at=now,
            payload=json.dumps(body)
        )
        db.add(db_event)
        db.commit()
        db.refresh(db_event)

        evaluate_rules(body, db_event.id)

    except Exception as e:
        logging.error(f"❌ Error guardando evento o evaluando reglas: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving event: {str(e)}")
    finally:
        db.close()

    return {"status": "ok", "stored": True}


@router.get("/")
def list_events(limit: int = 50):
    if limit <= 0:
        limit = 50
    result = EVENTS_IN_MEMORY[-limit:]
    return {"count": len(result), "events": result}


@router.get("/db")
def list_events_db(
    limit: int = 50,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rows = (
        db.query(EventDB)
        .order_by(EventDB.id.desc())
        .limit(limit)
        .all()
    )
    logging.info(f"🔍 Consulta DB por usuario {current_user.username}: {len(rows)} eventos encontrados.")

    events = []
    for row in rows:
        payload = json.loads(row.payload)
        events.append(
            {
                "id": row.id,
                "received_at": row.received_at.isoformat() + "Z",
                "event": payload,
            }
        )

    return {"count": len(events), "events": events}
