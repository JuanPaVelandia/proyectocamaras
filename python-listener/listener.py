import os
import json
import time
import logging
import base64
from datetime import datetime, timezone

import paho.mqtt.client as mqtt
import requests
from dotenv import load_dotenv

# Cargar variables .env
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

# ---------- Configuración desde variables de entorno ----------
CLOUD_API_URL = os.getenv("CLOUD_API_URL")
CLOUD_API_KEY = os.getenv("CLOUD_API_KEY")

MQTT_HOST = os.getenv("MQTT_HOST", "127.0.0.1")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "frigate/events/#")

CUSTOMER_ID = os.getenv("CUSTOMER_ID", "cliente_demo")
SITE_ID = os.getenv("SITE_ID", "sede_demo")

# URL de Frigate local para descargar snapshots
FRIGATE_URL = os.getenv("FRIGATE_URL", "http://frigate:5000")

# Mapeo de nombres de cámaras: local_name:remote_name,local_name2:remote_name2
CAMERA_MAPPING_STR = os.getenv("CAMERA_MAPPING", "")
CAMERA_MAPPING = {}
if CAMERA_MAPPING_STR:
    for mapping in CAMERA_MAPPING_STR.split(","):
        mapping = mapping.strip()
        if ":" in mapping:
            local_name, remote_name = mapping.split(":", 1)
            CAMERA_MAPPING[local_name.strip()] = remote_name.strip()
    logging.info(f"📋 Mapeo de cámaras configurado: {CAMERA_MAPPING}")

if not CLOUD_API_URL:
    raise RuntimeError("❌ CLOUD_API_URL no está definida en .env")


# ---------- Función para descargar snapshot de Frigate ----------
def download_snapshot(event_id: str) -> str:
    """Descarga el snapshot de Frigate y lo retorna como base64."""
    try:
        snapshot_url = f"{FRIGATE_URL}/api/events/{event_id}/snapshot.jpg"
        logging.info(f"📸 Descargando snapshot: {snapshot_url}")

        resp = requests.get(snapshot_url, timeout=5)

        if resp.status_code == 200:
            # Convertir a base64
            snapshot_b64 = base64.b64encode(resp.content).decode('utf-8')
            logging.info(f"✔ Snapshot descargado ({len(resp.content)} bytes)")
            return snapshot_b64
        else:
            logging.warning(f"⚠ No se pudo descargar snapshot: {resp.status_code}")
            return None
    except Exception as e:
        logging.error(f"❌ Error descargando snapshot: {e}")
        return None


# ---------- Función para enviar evento a la nube ----------
def send_event_to_cloud(event_payload: dict):
    """Hace POST del evento al backend en la nube."""
    try:
        headers = {
            "Content-Type": "application/json"
        }

        if CLOUD_API_KEY:
            headers["Authorization"] = f"Bearer {CLOUD_API_KEY}"

        resp = requests.post(
            CLOUD_API_URL,
            json=event_payload,
            headers=headers,
            timeout=7
        )

        if 200 <= resp.status_code < 300:
            logging.info(f"✔ Evento enviado a la nube (status {resp.status_code})")
        else:
            logging.warning(
                f"⚠ Error enviando a la nube: {resp.status_code} | {resp.text}"
            )
    except Exception as e:
        logging.error(f"❌ Excepción enviando evento a la nube: {e}")


# ---------- Normalización de evento de Frigate ----------
def normalize_frigate_event(data: dict) -> dict:
    """
    Recibe el payload bruto de Frigate (MQTT) y devuelve
    un evento "premium" con campos completos + raw.
    """
    # Nivel superior
    frigate_type = data.get("type")  # new / update / end

    before = data.get("before") or {}
    after = data.get("after") or {}

    # Usamos 'after' si existe, si no 'before'
    base = after or before or {}

    event_id = base.get("id")
    camera = base.get("camera")

    # Aplicar mapeo de nombre de cámara si existe
    if camera and camera in CAMERA_MAPPING:
        original_camera = camera
        camera = CAMERA_MAPPING[camera]
        logging.info(f"🔄 Cámara mapeada: '{original_camera}' → '{camera}'")

    label = base.get("label")
    sub_label = base.get("sub_label")
    top_score = base.get("top_score")
    score = base.get("score")
    false_positive = base.get("false_positive")
    max_severity = base.get("max_severity")

    start_time = base.get("start_time")
    end_time = base.get("end_time")
    duration_seconds = None
    try:
        if start_time is not None and end_time is not None:
            duration_seconds = float(end_time) - float(start_time)
    except Exception:
        pass

    box = base.get("box")
    area = base.get("area")
    ratio = base.get("ratio")
    region = base.get("region")

    has_clip = base.get("has_clip")
    has_snapshot = base.get("has_snapshot")

    current_zones = base.get("current_zones", [])
    entered_zones = base.get("entered_zones", [])

    stationary = base.get("stationary")
    motionless_count = base.get("motionless_count")
    position_changes = base.get("position_changes")

    current_estimated_speed = base.get("current_estimated_speed")
    average_estimated_speed = base.get("average_estimated_speed")
    velocity_angle = base.get("velocity_angle")

    path_data = base.get("path_data")

    license_plate = base.get("recognized_license_plate")
    license_plate_score = base.get("recognized_license_plate_score")

    snapshot = base.get("snapshot") or {}
    snapshot_normalized = None
    if snapshot:
        snapshot_normalized = {
            "frame_time": snapshot.get("frame_time"),
            "box": snapshot.get("box"),
            "area": snapshot.get("area"),
            "region": snapshot.get("region"),
            "score": snapshot.get("score"),
            "attributes": snapshot.get("attributes", []),
        }

    normalized = {
        "customer_id": CUSTOMER_ID,
        "site_id": SITE_ID,

        "event_id": event_id,
        "frigate_type": frigate_type,
        "camera": camera,
        "label": label,
        "sub_label": sub_label,

        "top_score": top_score,
        "score": score,
        "false_positive": false_positive,
        "max_severity": max_severity,

        "start_time": start_time,
        "end_time": end_time,
        "duration_seconds": duration_seconds,
        "timestamp": datetime.now(timezone.utc).isoformat(),

        "box": box,
        "area": area,
        "ratio": ratio,
        "region": region,

        "has_clip": has_clip,
        "has_snapshot": has_snapshot,

        "zones": current_zones,
        "entered_zones": entered_zones,

        "stationary": stationary,
        "motionless_count": motionless_count,
        "position_changes": position_changes,

        "current_estimated_speed": current_estimated_speed,
        "average_estimated_speed": average_estimated_speed,
        "velocity_angle": velocity_angle,

        "path_data": path_data,

        "license_plate": license_plate,
        "license_plate_score": license_plate_score,

        "snapshot": snapshot_normalized,

        # Dejamos el evento original por si mañana quieres algo más
        "raw": data,
    }

    return normalized


# ---------- Callbacks MQTT ----------
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info("✔ Conectado al broker MQTT")
        client.subscribe(MQTT_TOPIC)
        logging.info(f"📡 Suscrito al topic: {MQTT_TOPIC}")
    else:
        logging.error(f"❌ Error al conectar a MQTT (rc={rc})")


def on_message(client, userdata, msg):
    try:
        payload_str = msg.payload.decode("utf-8")
        data = json.loads(payload_str)
    except Exception as e:
        logging.error(f"❌ Error parseando MQTT payload: {e}")
        return

    normalized_event = normalize_frigate_event(data)

    logging.info(
        f"📥 Evento normalizado: camera={normalized_event.get('camera')}, "
        f"label={normalized_event.get('label')}, "
        f"type={normalized_event.get('frigate_type')}, "
        f"id={normalized_event.get('event_id')}"
    )

    # Descargar snapshot si tiene has_snapshot y es evento 'end'
    event_id = normalized_event.get('event_id')
    has_snapshot = normalized_event.get('has_snapshot')
    frigate_type = normalized_event.get('frigate_type')

    if event_id and has_snapshot and frigate_type == 'end':
        snapshot_b64 = download_snapshot(event_id)
        if snapshot_b64:
            normalized_event['snapshot_base64'] = snapshot_b64

    send_event_to_cloud(normalized_event)


# ---------- Loop principal ----------
def main():
    client = mqtt.Client()

    if MQTT_USER and MQTT_PASSWORD:
        client.username_pw_set(MQTT_USER, MQTT_PASSWORD)

    client.on_connect = on_connect
    client.on_message = on_message

    while True:
        try:
            logging.info(f"🔌 Conectando a MQTT {MQTT_HOST}:{MQTT_PORT} ...")
            client.connect(MQTT_HOST, MQTT_PORT, 60)
            client.loop_forever()
        except Exception as e:
            logging.error(f"❌ Error en MQTT: {e}")
            logging.info("⏳ Reintentando en 5 segundos...")
            time.sleep(5)


if __name__ == "__main__":
    main()
