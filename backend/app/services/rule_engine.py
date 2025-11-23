import logging
from typing import Dict, Any
from datetime import datetime, time
from app.db.session import SessionLocal
from app.models.all_models import RuleDB, RuleHitDB
from app.services.whatsapp import send_whatsapp_message, send_whatsapp_image

def evaluate_rules(event_body: Dict[str, Any], event_db_id: int):
    """
    Recorre todas las reglas activas de todos los usuarios.
    Si una coincide con el evento, dispara WhatsApp al número del dueño de la regla.
    """
    db = SessionLocal()
    try:
        rules = db.query(RuleDB).filter(RuleDB.enabled == True).all()
        
        logging.info(f"🔍 Evaluando {len(rules)} reglas activas para evento_id={event_db_id}")

        camera = event_body.get("camera")
        label = event_body.get("label")
        frigate_type = event_body.get("frigate_type")
        score = event_body.get("score") or event_body.get("top_score")
        duration = event_body.get("duration_seconds")
        
        logging.info(f"📊 Evento: camera={camera}, label={label}, type={frigate_type}, score={score}, duration={duration}")

        for rule in rules:
            match = True
            reasons = []

            if rule.camera and rule.camera != camera:
                match = False
                reasons.append(f"camera mismatch (esperaba '{rule.camera}', recibió '{camera}')")
            if rule.label:
                # Soporte para múltiples objetos separados por comas
                rule_labels = [l.strip().lower() for l in rule.label.split(",") if l.strip()]
                if label and label.lower() not in rule_labels:
                    match = False
                    reasons.append(f"label mismatch (esperaba uno de {rule_labels}, recibió '{label}')")
            if rule.frigate_type and rule.frigate_type != frigate_type:
                match = False
                reasons.append(f"type mismatch (esperaba '{rule.frigate_type}', recibió '{frigate_type}')")
            if rule.min_score is not None:
                if score is None or float(score) < float(rule.min_score):
                    match = False
                    reasons.append(f"score too low (min={rule.min_score}, actual={score})")
            if rule.min_duration_seconds is not None:
                if duration is None or float(duration) < float(rule.min_duration_seconds):
                    match = False
                    reasons.append(f"duration too short (min={rule.min_duration_seconds}, actual={duration})")
            
            # Validar rango horario si está configurado
            if rule.time_start or rule.time_end:
                current_time = datetime.now().time()
                time_start = None
                time_end = None
                
                try:
                    if rule.time_start:
                        time_start = datetime.strptime(rule.time_start, "%H:%M").time()
                    if rule.time_end:
                        time_end = datetime.strptime(rule.time_end, "%H:%M").time()
                    
                    # Si solo hay hora de inicio, verificar que la hora actual sea >= hora inicio
                    if time_start and not time_end:
                        if current_time < time_start:
                            match = False
                            reasons.append(f"time before start (current={current_time.strftime('%H:%M')}, start={rule.time_start})")
                    # Si solo hay hora de fin, verificar que la hora actual sea <= hora fin
                    elif time_end and not time_start:
                        if current_time > time_end:
                            match = False
                            reasons.append(f"time after end (current={current_time.strftime('%H:%M')}, end={rule.time_end})")
                    # Si hay ambas horas, verificar que esté en el rango
                    elif time_start and time_end:
                        # Manejar el caso donde el rango cruza medianoche (ej: 22:00 - 06:00)
                        if time_start <= time_end:
                            # Rango normal (ej: 08:00 - 22:00)
                            if not (time_start <= current_time <= time_end):
                                match = False
                                reasons.append(f"time out of range (current={current_time.strftime('%H:%M')}, range={rule.time_start}-{rule.time_end})")
                        else:
                            # Rango que cruza medianoche (ej: 22:00 - 06:00)
                            if not (current_time >= time_start or current_time <= time_end):
                                match = False
                                reasons.append(f"time out of range (current={current_time.strftime('%H:%M')}, range={rule.time_start}-{rule.time_end})")
                except Exception as e:
                    logging.error(f"❌ Error validando rango horario para regla {rule.id}: {e}")
                    # Si hay error parseando las horas, no bloqueamos la regla

            if not match:
                logging.info(f"❌ Regla '{rule.name}' (ID={rule.id}) NO coincide: {', '.join(reasons)}")
                continue

            # Registramos el hit
            hit = RuleHitDB(
                rule_id=rule.id,
                event_id=event_db_id,
                action="whatsapp"
            )
            db.add(hit)
            db.commit()

            logging.info(
                f"🔔 Regla '{rule.name}' disparada para evento_id={event_db_id} "
                f"(camera={camera}, label={label}, type={frigate_type}, score={score}, duration={duration})"
            )

            # Enviar WhatsApp al número del dueño de la regla
            # (solo si tiene número y notificaciones habilitadas)
            if rule.user and rule.user.whatsapp_number and rule.user.whatsapp_notifications_enabled:
                # Usar mensaje personalizado o mensaje por defecto
                if rule.custom_message:
                    # Reemplazar variables en el mensaje personalizado
                    try:
                        msg = rule.custom_message.format(
                            camera=camera or "N/A",
                            label=label or "N/A",
                            frigate_type=frigate_type or "N/A",
                            score=round(float(score) * 100, 1) if score else 0,
                            duration=round(float(duration), 1) if duration else 0,
                            event_id=event_db_id,
                            rule_name=rule.name
                        )
                    except Exception as e:
                        logging.error(f"❌ Error formateando mensaje personalizado: {e}")
                        msg = f"🔔 Alerta: {rule.name}"
                else:
                    # Mensaje por defecto
                    msg = (
                        f"🔔 Alerta: {rule.name}\n"
                        f"Cámara: {camera}\n"
                        f"Objeto: {label}\n"
                        f"Tipo: {frigate_type}\n"
                        f"Score: {round(float(score) * 100, 1) if score else 0}%\n"
                        f"Duración: {round(float(duration), 1) if duration else 0}s\n"
                        f"Evento ID: {event_db_id}"
                    )
                
                # Intentar obtener snapshot URL
                snapshot_url = None
                frigate_host = "http://frigate:5000"  # URL interna de Frigate
                
                # Frigate genera snapshots en: /api/events/{event_id}/snapshot.jpg
                frigate_event_id = event_body.get("event_id")
                if frigate_event_id:
                    snapshot_url = f"{frigate_host}/api/events/{frigate_event_id}/snapshot.jpg"
                    logging.info(f"📸 Snapshot URL: {snapshot_url}")
                
                # Enviar con imagen si tenemos snapshot_url
                if snapshot_url:
                    send_whatsapp_image(snapshot_url, msg, to_number=rule.user.whatsapp_number)
                else:
                    send_whatsapp_message(msg, to_number=rule.user.whatsapp_number)
            else:
                if not rule.user:
                    logging.info(f"ℹ️ Regla {rule.id} no tiene usuario asignado. No se envía WhatsApp.")
                elif not rule.user.whatsapp_number:
                    logging.info(f"ℹ️ Usuario {rule.user.username} no tiene número de WhatsApp configurado. No se envía WhatsApp.")
                elif not rule.user.whatsapp_notifications_enabled:
                    logging.info(f"ℹ️ Usuario {rule.user.username} tiene notificaciones de WhatsApp desactivadas. No se envía WhatsApp.")
    except Exception as e:
        logging.error(f"❌ Error en evaluate_rules: {e}")
    finally:
        db.close()
