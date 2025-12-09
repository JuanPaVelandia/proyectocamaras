import os
import json
import time
import logging
import base64
from datetime import datetime, timezone
from threading import Thread, Event
from urllib.parse import urlparse

import paho.mqtt.client as mqtt
import requests
from dotenv import load_dotenv

# Cargar variables .env (solo si no están ya definidas como variables de entorno)
# Esto permite que las variables de entorno del sistema/docker tengan prioridad
load_dotenv(override=False)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

# ---------- Configuración desde variables de entorno ----------
CLOUD_API_URL = os.getenv("CLOUD_API_URL")
CLOUD_API_BASE = os.getenv("CLOUD_API_BASE")
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

# Tamaño máximo del snapshot en base64 (en bytes). Si excede, no se envía.
# Por defecto 150KB en base64 (~110KB de imagen original)
# Nota: El error 431 puede ocurrir con payloads > 200KB totales
MAX_SNAPSHOT_SIZE_B64 = int(os.getenv("MAX_SNAPSHOT_SIZE_B64", "150000"))

# Configuración de compresión de imágenes
SNAPSHOT_MAX_WIDTH = int(os.getenv("SNAPSHOT_MAX_WIDTH", "800"))  # Ancho máximo en píxeles
SNAPSHOT_MAX_HEIGHT = int(os.getenv("SNAPSHOT_MAX_HEIGHT", "600"))  # Alto máximo en píxeles
SNAPSHOT_QUALITY = int(os.getenv("SNAPSHOT_QUALITY", "75"))  # Calidad JPEG (1-100, menor = más compresión)

# Mapeo de nombres de cámaras: local_name:remote_name,local_name2:remote_name2
# Lo que está haciendo es un arreglo para que el nombre de la cámara en frigate sea el mismo que el nombre de la cámara en la nube
ENV_CAMERA_MAPPING_STR = os.getenv("CAMERA_MAPPING", "")
CAMERA_MAPPING = {}
if ENV_CAMERA_MAPPING_STR:
    for mapping in ENV_CAMERA_MAPPING_STR.split(","):
        mapping = mapping.strip()
        if ":" in mapping:
            local_name, remote_name = mapping.split(":", 1)
            CAMERA_MAPPING[local_name.strip()] = remote_name.strip()
    logging.info(f"📋 Mapeo de cámaras (ENV) configurado: {CAMERA_MAPPING}")

if not CLOUD_API_URL:
    raise RuntimeError("❌ CLOUD_API_URL no está definida en .env")


# ---------- Helper: Compute API base ----------
# Descubrir cuál es la dirección principal de tu servidor
def compute_api_base() -> str:
    if CLOUD_API_BASE:
        return CLOUD_API_BASE.rstrip("/")
    # Try derive from events URL
    # Expect something like: https://host/api/events/
    url = CLOUD_API_URL.rstrip("/")
    if url.endswith("/api/events"):
        return url.rsplit("/api/events", 1)[0]
    return url  # fallback


# ---------- Función para comprimir imagen ----------
def compress_image(image_bytes: bytes, max_width: int = None, max_height: int = None, quality: int = 75) -> bytes:
    """
    Comprime una imagen JPEG reduciendo tamaño y/o calidad.
    
    Args:
        image_bytes: Bytes de la imagen original
        max_width: Ancho máximo en píxeles (None = mantener proporción)
        max_height: Alto máximo en píxeles (None = mantener proporción)
        quality: Calidad JPEG (1-100, menor = más compresión)
    
    Returns:
        Bytes de la imagen comprimida
    """
    try:
        from PIL import Image
        from io import BytesIO
        
        # Abrir imagen desde bytes
        img = Image.open(BytesIO(image_bytes))
        original_size = len(image_bytes)
        
        # Convertir a RGB si es necesario (para JPEG)
        if img.mode in ('RGBA', 'LA', 'P'):
            # Crear fondo blanco para imágenes con transparencia
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = rgb_img
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Redimensionar si es necesario
        if max_width or max_height:
            # Calcular nuevo tamaño manteniendo proporción
            width, height = img.size
            ratio = min(
                (max_width or width) / width,
                (max_height or height) / height
            )
            
            # Solo redimensionar si la imagen es más grande
            if ratio < 1.0:
                new_width = int(width * ratio)
                new_height = int(height * ratio)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                logging.debug(f"📐 Imagen redimensionada: {width}x{height} → {new_width}x{new_height}")
        
        # Comprimir a JPEG
        output = BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        compressed_bytes = output.getvalue()
        compressed_size = len(compressed_bytes)
        
        # Log de compresión
        compression_ratio = (1 - compressed_size / original_size) * 100
        logging.info(f"🗜️ Imagen comprimida: {original_size} bytes → {compressed_size} bytes ({compression_ratio:.1f}% reducción)")
        
        return compressed_bytes
    except ImportError:
        logging.warning("⚠ Pillow no está instalado, no se puede comprimir la imagen")
        return image_bytes
    except Exception as e:
        logging.error(f"❌ Error comprimiendo imagen: {e}")
        return image_bytes  # Retornar original si falla


# ---------- Función para descargar snapshot de Frigate ----------
def download_snapshot(event_id: str) -> str:
    """Descarga el snapshot de Frigate, lo comprime y lo retorna como base64."""
    try:
        snapshot_url = f"{FRIGATE_URL}/api/events/{event_id}/snapshot.jpg"
        logging.info(f"📸 Descargando snapshot: {snapshot_url}")

        resp = requests.get(snapshot_url, timeout=5)

        if resp.status_code == 200:
            original_size = len(resp.content)
            
            # Comprimir imagen antes de convertir a base64
            compressed_bytes = compress_image(
                resp.content,
                max_width=SNAPSHOT_MAX_WIDTH,
                max_height=SNAPSHOT_MAX_HEIGHT,
                quality=SNAPSHOT_QUALITY
            )
            
            # Convertir a base64
            snapshot_b64 = base64.b64encode(compressed_bytes).decode('utf-8')
            final_size = len(snapshot_b64)
            
            logging.info(f"✔ Snapshot descargado y comprimido: {original_size} bytes → {len(compressed_bytes)} bytes (base64: {final_size} bytes)")
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

        # Calcular tamaño aproximado del payload
        import json as json_lib
        payload_size = len(json_lib.dumps(event_payload))
        snapshot_size = len(event_payload.get('snapshot_base64', ''))
        
        # Verificar tamaño total del payload antes de enviar
        # El error 431 generalmente ocurre con payloads > 200KB
        MAX_PAYLOAD_SIZE = 180000  # 180KB para dejar margen
        
        if payload_size > MAX_PAYLOAD_SIZE:
            logging.warning(f"⚠ Payload demasiado grande ({payload_size} bytes), removiendo snapshot...")
            if 'snapshot_base64' in event_payload:
                snapshot_size = len(event_payload.get('snapshot_base64', ''))
                del event_payload['snapshot_base64']
                payload_size = len(json_lib.dumps(event_payload))
                logging.info(f"   Snapshot removido ({snapshot_size} bytes), nuevo tamaño: {payload_size} bytes")
        
        if snapshot_size > 0:
            logging.debug(f"📤 Enviando evento con snapshot ({snapshot_size} bytes base64, payload total: ~{payload_size} bytes)")
        else:
            logging.debug(f"📤 Enviando evento a: {CLOUD_API_URL} (payload: ~{payload_size} bytes)")
        
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
            if resp.status_code == 431:
                logging.error(f"❌ Error 431: Payload demasiado grande (~{payload_size} bytes)")
                logging.error(f"   El snapshot en base64 es muy grande ({snapshot_size} bytes)")
                # Reintentar sin el snapshot
                if 'snapshot_base64' in event_payload:
                    logging.info(f"🔄 Reintentando envío sin snapshot...")
                    event_without_snapshot = event_payload.copy()
                    del event_without_snapshot['snapshot_base64']
                    retry_resp = requests.post(
                        CLOUD_API_URL,
                        json=event_without_snapshot,
                        headers=headers,
                        timeout=7
                    )
                    if 200 <= retry_resp.status_code < 300:
                        logging.info(f"✔ Evento enviado sin snapshot (status {retry_resp.status_code})")
                    else:
                        logging.error(f"❌ Error al reintentar sin snapshot: {retry_resp.status_code} | {retry_resp.text}")
                else:
                    logging.error(f"   Considera reducir el tamaño del payload")
            elif resp.status_code == 502:
                logging.error(f"❌ Error 502: El backend no está respondiendo")
                logging.error(f"   Verifica que el backend esté funcionando en Railway")
                logging.error(f"   URL intentada: {CLOUD_API_URL}")
    except requests.exceptions.Timeout:
        logging.error(f"❌ Timeout enviando evento a la nube (URL: {CLOUD_API_URL})")
        logging.error(f"   El backend tardó más de 7 segundos en responder")
    except requests.exceptions.ConnectionError as e:
        logging.error(f"❌ Error de conexión a la nube: {e}")
        logging.error(f"   URL intentada: {CLOUD_API_URL}")
        logging.error(f"   Verifica que la URL sea correcta y el backend esté accesible")
    except Exception as e:
        logging.error(f"❌ Excepción enviando evento a la nube: {type(e).__name__}: {e}")
        logging.error(f"   URL intentada: {CLOUD_API_URL}")


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
        logging.debug(f"🔄 Cámara mapeada: '{original_camera}' → '{camera}'")

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
        "type": frigate_type, # Backend expects 'type'
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


# ---------- Dynamic mapping sync ----------
#Normaliza las direcciones de las cámaras para dejarlas en un formato único y borrarle sus credenciales
def normalize_rtsp(rtsp: str) -> str:
    try:
        if not rtsp:
            return ""
        # strip credentials
        if "@" in rtsp and rtsp.startswith("rtsp://"):
            prefix, rest = rtsp.split("//", 1)
            creds_and_host = rest
            if "@" in creds_and_host:
                after_at = creds_and_host.split("@", 1)[1]
                return f"rtsp://{after_at}".lower().rstrip("/")
        return rtsp.lower().rstrip("/")
    except Exception:
        return rtsp or ""

#Esta función le pregunta al servidor las cámaras que tiene registradas
def fetch_backend_cameras() -> list[dict]:
    try:
        base = compute_api_base()
        url = f"{base}/api/cameras/ingest-mapping"
        headers = {"Content-Type": "application/json"}
        if CLOUD_API_KEY:
            headers["Authorization"] = f"Bearer {CLOUD_API_KEY}"
        r = requests.get(url, headers=headers, timeout=7)
        if 200 <= r.status_code < 300:
            data = r.json()
            return data.get("cameras", [])
        logging.warning(f"⚠ Ingest mapping HTTP {r.status_code}: {r.text}")
        return []
    except Exception as e:
        logging.error(f"❌ Error obteniendo ingest mapping: {e}")
        return []


#
def fetch_frigate_inputs() -> dict:
    try:
        # Get config from Frigate
        resp = requests.get(f"{FRIGATE_URL}/api/config", timeout=5)
        if resp.status_code != 200:
            return {}
        cfg = resp.json() or {}
        cams = cfg.get("cameras", {}) or {}
        result = {}
        for name, conf in cams.items():
            inputs = []
            try:
                inputs_list = conf.get("ffmpeg", {}).get("inputs", [])
                for inp in inputs_list:
                    path = inp.get("path")
                    if path:
                        inputs.append(normalize_rtsp(path))
            except Exception:
                pass
            result[name] = inputs
        return result
    except Exception as e:
        logging.error(f"❌ Error obteniendo config de Frigate: {e}")
        return {}


def build_dynamic_mapping() -> dict:
    """Build mapping local_name -> backend_name using RTSP match when names differ.
    If names equal, keep identity. Merge with ENV mapping (ENV has priority).
    """
    mapping = dict(CAMERA_MAPPING)  # start with ENV
    try:
        backend_cams = fetch_backend_cameras()
        frigate_inputs = fetch_frigate_inputs()
        # index backend by normalized rtsp
        rtsp_to_backend_name = {}
        for cam in backend_cams:
            n = cam.get("name")
            rtsp = normalize_rtsp(cam.get("rtsp_url") or "")
            if rtsp:
                rtsp_to_backend_name[rtsp] = n
        # identity for exact name matches
        for local_name in frigate_inputs.keys():
            if local_name in mapping:
                continue
            # If backend has camera with same name, map identity
            if any(c.get("name") == local_name for c in backend_cams):
                mapping[local_name] = local_name
                continue
            # else try RTSP match
            inputs = frigate_inputs.get(local_name, [])
            for path in inputs:
                if path in rtsp_to_backend_name:
                    mapping[local_name] = rtsp_to_backend_name[path]
                    break
        logging.info(f"🔁 Mapeo dinámico de cámaras: {mapping}")
    except Exception as e:
        logging.error(f"❌ Error construyendo mapeo dinámico: {e}")
    return mapping


STOP_EVENT = Event()


def mapping_refresher_loop(interval_sec: int = 60):
    global CAMERA_MAPPING
    while not STOP_EVENT.is_set():
        CAMERA_MAPPING = build_dynamic_mapping()
        for _ in range(interval_sec):
            if STOP_EVENT.is_set():
                break
            time.sleep(1)


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

    # DATA SAVING FIX: Filter out 'update' events locally
    if normalized_event.get('frigate_type') == 'update':
        return

    logging.info(
        f"📥 Evento normalizado: customer={CUSTOMER_ID}, camera={normalized_event.get('camera')}, "
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
            snapshot_size = len(snapshot_b64)
            if snapshot_size > MAX_SNAPSHOT_SIZE_B64:
                logging.warning(
                    f"⚠ Snapshot demasiado grande ({snapshot_size} bytes), "
                    f"excede el límite de {MAX_SNAPSHOT_SIZE_B64} bytes. No se incluirá en el evento."
                )
            else:
                normalized_event['snapshot_base64'] = snapshot_b64

    send_event_to_cloud(normalized_event)


# ---------- Loop principal ----------
def main():
    client = mqtt.Client()

    if MQTT_USER and MQTT_PASSWORD:
        client.username_pw_set(MQTT_USER, MQTT_PASSWORD)

    client.on_connect = on_connect
    client.on_message = on_message

    # start mapping refresher thread
    t = Thread(target=mapping_refresher_loop, kwargs={"interval_sec": 90}, daemon=True)
    t.start()

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
