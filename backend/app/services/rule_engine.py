import logging
import os
from typing import Dict, Any
from datetime import datetime, time
from sqlalchemy import or_

from app.db.session import SessionLocal
from app.models.all_models import RuleDB, RuleHitDB, EventDB, UserDB
from app.services.whatsapp import send_whatsapp_message, send_whatsapp_image

def evaluate_rules(event_body: Dict[str, Any], event_db_id: int):
    """
    VERSIÓN OPTIMIZADA:
    1. Seguridad: Filtra reglas por customer_id (Usuario) y Cámara.
    2. Precisión: Usa el score máximo histórico (max(score, top_score)).
    3. Rendimiento: Carga la foto solo si es necesario.
    """
    db = SessionLocal()
    try:
        # --- PASO 1: IDENTIFICACIÓN DEL DUEÑO (SEGURIDAD) ---
        customer_id = event_body.get("customer_id")
        
        logging.info(f"🔍 Rule Engine - Procesando evento {event_db_id}")
        logging.info(f"   - Customer ID recibido: {customer_id}")
        logging.info(f"   - Cámara: {event_body.get('camera')}")
        logging.info(f"   - Label: {event_body.get('label')}")
        logging.info(f"   - Tipo: {event_body.get('frigate_type')}")
        
        # Validación: Si el evento no tiene dueño, es peligroso procesarlo.
        if not customer_id:
            logging.warning(f"⚠️ Evento {event_db_id} rechazado: Falta 'customer_id'.")
            logging.warning(f"   Campos disponibles en el evento: {list(event_body.keys())}")
            return

        # Buscamos al usuario dueño en la base de datos
        owner_user = db.query(UserDB).filter(UserDB.username == customer_id).first()
        
        if not owner_user:
            logging.warning(f"⚠️ Evento rechazado: El usuario '{customer_id}' no existe en la BD.")
            logging.warning(f"   Verifica que el CUSTOMER_ID en el listener coincida con un username en la BD")
            return
        
        logging.info(f"✅ Usuario encontrado: {owner_user.username} (ID: {owner_user.id})")

        # Validar si el usuario pagó (El "Interruptor")
        # if not owner_user.is_active: 
        #     return 

        # --- PASO 2: OBTENCIÓN DE DATOS DEL EVENTO ---
        camera_name = event_body.get("camera")
        label = event_body.get("label")
        frigate_type = event_body.get("frigate_type")
        duration = event_body.get("duration_seconds")

        # CORRECCIÓN DEL BUG DE SCORE:
        # Tomamos el mayor entre el score final y el mejor score histórico
        current_score = float(event_body.get("score") or 0.0)
        top_score = float(event_body.get("top_score") or 0.0)
        final_score = max(current_score, top_score)

        # --- PASO 3: CONSULTA OPTIMIZADA (EFICIENCIA) ---
        # Solo traemos las reglas de ESTE usuario y para ESTA cámara
        rules = db.query(RuleDB).filter(
            RuleDB.user_id == owner_user.id,
            RuleDB.enabled == True,
            or_(
                RuleDB.camera == None,       # Reglas globales
                RuleDB.camera == "",         # Reglas globales (string vacío)
                RuleDB.camera.ilike(camera_name) # Reglas específicas (insensible a mayúsculas)
            )
        ).all()

        if not rules:
            logging.info(f"ℹ️ Usuario {owner_user.username} no tiene reglas activas para cámara '{camera_name}'.")
            return

        logging.info(f"🔍 Evaluando {len(rules)} reglas para {owner_user.username} (Cam: {camera_name}, Score: {final_score})")

        # --- PASO 4: EVALUACIÓN DE CADA REGLA ---
        for rule in rules:
            match = True
            reasons = []

            # A. Validación de Etiqueta (Label)
            if rule.label:
                rule_labels = [l.strip().lower() for l in rule.label.split(",") if l.strip()]
                if label and label.lower() not in rule_labels:
                    match = False
                    reasons.append(f"label mismatch")
            
            # B. Validación de Tipo (New/End) - Anti Spam
            if rule.frigate_type:
                if rule.frigate_type != frigate_type:
                    match = False
                    reasons.append(f"type mismatch")
            else:
                # Por defecto, ignoramos los 'update' si la regla no dice nada
                if frigate_type not in ['new', 'end']:
                    match = False
                    reasons.append(f"ignoring update")

            # C. Validación de Score (Usando el final_score corregido)
            if rule.min_score is not None:
                if final_score < float(rule.min_score):
                    match = False
                    reasons.append(f"score too low ({final_score} < {rule.min_score})")

            # D. Validación de Duración
            if rule.min_duration_seconds is not None:
                curr_dur = float(duration) if duration else 0.0
                if curr_dur < float(rule.min_duration_seconds):
                    match = False
                    reasons.append(f"duration too short")

            # E. Validación de Horario
            if rule.time_start or rule.time_end:
                try:
                    now_time = datetime.now().time() # OJO: Asegurar zona horaria correcta en el futuro
                    t_start = datetime.strptime(rule.time_start, "%H:%M").time() if rule.time_start else None
                    t_end = datetime.strptime(rule.time_end, "%H:%M").time() if rule.time_end else None
                    
                    in_range = True
                    if t_start and t_end:
                        if t_start <= t_end: # Rango diurno (08:00 - 18:00)
                            in_range = t_start <= now_time <= t_end
                        else: # Rango nocturno (22:00 - 06:00)
                            in_range = now_time >= t_start or now_time <= t_end
                    elif t_start:
                        in_range = now_time >= t_start
                    elif t_end:
                        in_range = now_time <= t_end
                    
                    if not in_range:
                        match = False
                        reasons.append("time out of range")
                except Exception as e:
                    logging.error(f"Error validando hora: {e}")

            if not match:
                # logging.debug(f"Regla {rule.name} descartada: {reasons}")
                continue

            # --- PASO 5: EJECUCIÓN (MATCH EXITOSO) ---
            
            # Registrar el disparo de la regla
            hit = RuleHitDB(rule_id=rule.id, event_id=event_db_id, action="whatsapp")
            db.add(hit)
            db.commit()

            # Validaciones finales de usuario para WhatsApp
            if not owner_user.whatsapp_number or not owner_user.whatsapp_notifications_enabled:
                logging.info(f"🔕 Usuario {owner_user.username} tiene notificaciones apagadas o sin número.")
                continue

            # Construir mensaje (Aquí luego implementaremos Templates)
            msg = (
                f"🔔 *Alerta Vidria*\n"
                f"📹 Cámara: {camera_name}\n"
                f"🔍 Objeto: {label}\n"
                f"📊 Confianza: {int(final_score * 100)}%"
            )

            # Carga LAZY de la imagen (Solo si vamos a enviar)
            snapshot_b64 = None
            event_record = db.query(EventDB).filter(EventDB.id == event_db_id).first()
            if event_record and event_record.snapshot_base64:
                snapshot_b64 = event_record.snapshot_base64

            # Enviar
            if snapshot_b64:
                send_whatsapp_image(snapshot_b64, msg, to_number=owner_user.whatsapp_number, is_base64=True)
            else:
                send_whatsapp_message(msg, to_number=owner_user.whatsapp_number)

            logging.info(f"✅ Notificación enviada a {owner_user.username} por regla '{rule.name}'")

    except Exception as e:
        logging.error(f"❌ Error CRÍTICO en evaluate_rules: {e}")
    finally:
        db.close()