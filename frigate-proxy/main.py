"""
Servicio Proxy Local para Frigate
Este servicio se ejecuta localmente y actúa como puente entre el frontend y Frigate local.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
import logging
import yaml
import paho.mqtt.client as mqtt
import socket
import ipaddress
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Tuple
import threading
from urllib.parse import urlparse
import time
try:
    from onvif import ONVIFCamera
    ONVIF_AVAILABLE = True
except Exception:
    ONVIF_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Frigate Local Proxy")

# Configurar CORS para permitir peticiones del frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar el dominio de Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# URL de Frigate local (por defecto)
FRIGATE_HOST = os.getenv("FRIGATE_HOST", "http://localhost:5000")
FRIGATE_API_URL = f"{FRIGATE_HOST}/api"
CONFIG_PATH = os.getenv("FRIGATE_CONFIG_PATH", "/config/config.yml")
MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

@app.get("/health")
async def health():
    """Health check del proxy"""
    return {"status": "healthy", "service": "frigate-proxy"}

@app.get("/api/frigate/cameras")
async def get_cameras():
    """Obtiene la lista de cámaras desde Frigate local"""
    try:
        response = requests.get(f"{FRIGATE_API_URL}/config", timeout=5)
        if response.status_code == 200:
            config = response.json()
            cameras = []
            if "cameras" in config:
                cameras = list(config["cameras"].keys())
            logger.info(f"Cámaras obtenidas de Frigate: {cameras}")
            return {"cameras": cameras}
        else:
            logger.warning(f"Error obteniendo config de Frigate: {response.status_code}")
            return {"cameras": []}
    except Exception as e:
        logger.error(f"Error conectando a Frigate: {e}")
        return {"cameras": []}

@app.get("/api/frigate/objects")
async def get_objects():
    """Retorna la lista de objetos COCO (no necesita Frigate)"""
    # Esta lista es estática, no necesita conectarse a Frigate
    objects = [
        "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
        "traffic_light", "fire_hydrant", "stop_sign", "parking_meter", "bench", "bird", "cat",
        "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
        "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports_ball",
        "kite", "baseball_bat", "baseball_glove", "skateboard", "surfboard", "tennis_racket",
        "bottle", "wine_glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
        "sandwich", "orange", "broccoli", "carrot", "hot_dog", "pizza", "donut", "cake",
        "chair", "couch", "potted_plant", "bed", "dining_table", "toilet", "tv", "laptop",
        "mouse", "remote", "keyboard", "cell_phone", "microwave", "oven", "toaster", "sink",
        "refrigerator", "book", "clock", "vase", "scissors", "teddy_bear", "hair_drier", "toothbrush"
    ]
    return {"objects": objects}


# ----------- Helpers: config write + reload -------------
def write_camera_to_config(name: str, rtsp_url: str) -> bool:
    try:
        if not os.path.exists(CONFIG_PATH):
            logger.warning("CONFIG_PATH no existe; no se puede escribir config.yml")
            return False
        with open(CONFIG_PATH, 'r') as f:
            cfg = yaml.safe_load(f.read() or "{}") or {}
        cams = cfg.get('cameras') or {}
        if name not in cams:
            cams[name] = {
                'ffmpeg': {
                    'inputs': [{
                        'path': rtsp_url,
                        'roles': ['detect', 'record'],
                    }]
                },
                'detect': {'width': 1920, 'height': 1080, 'fps': 5},
                'record': {'enabled': True, 'retain': {'days': 1, 'mode': 'motion'}},
                'snapshots': {'enabled': True, 'timestamp': True, 'bounding_box': True, 'retain': {'default': 1}},
            }
        cfg['cameras'] = cams
        with open(CONFIG_PATH, 'w') as f:
            yaml.dump(cfg, f, default_flow_style=False, sort_keys=False)
        logger.info(f"✅ Cámara '{name}' escrita en {CONFIG_PATH}")
        return True
    except Exception as e:
        logger.error(f"❌ Error escribiendo config.yml: {e}")
        return False


def reload_frigate_http() -> bool:
    try:
        r = requests.post(f"{FRIGATE_API_URL}/reload", timeout=5)
        if 200 <= r.status_code < 300:
            logger.info("✅ Frigate recargado vía HTTP /api/reload")
            return True
        logger.warning(f"⚠️ Reload HTTP fallo: {r.status_code} {r.text}")
        return False
    except Exception as e:
        logger.debug(f"Reload HTTP no disponible: {e}")
        return False


def reload_frigate_mqtt() -> bool:
    try:
        client = mqtt.Client()
        client.connect(MQTT_HOST, MQTT_PORT, 30)
        client.publish("frigate/reload", payload="now", qos=0, retain=False)
        client.publish("frigate/restart", payload="now", qos=0, retain=False)
        client.disconnect()
        logger.info("📡 MQTT publicado: frigate/reload y frigate/restart")
        return True
    except Exception as e:
        logger.error(f"❌ Error MQTT: {e}")
        return False


@app.post("/api/frigate/reload")
async def api_reload():
    ok = reload_frigate_http()
    if not ok:
        ok = reload_frigate_mqtt()
    if not ok:
        raise HTTPException(status_code=500, detail="No se pudo recargar Frigate")
    return {"status": "ok"}


# --------------- Discovery (Unicast) ---------------
ONVIF_PATHS = [
    "/onvif/device_service",
    "/onvif/device_service/",
    "/onvif/DeviceService",
]


def _http_onvif_probe(ip: str, ports: List[int], timeout: float) -> List[int]:
    """Optimized ONVIF probe with parallelization and early exit"""
    found = []
    found_lock = threading.Lock()

    def try_port_path(port: int, path: str) -> Tuple[bool, int]:
        """Try a single port/path combination"""
        url = f"http://{ip}:{port}{path}"
        try:
            probe_start = time.time()
            r = requests.get(url, timeout=timeout)
            probe_duration = time.time() - probe_start

            if probe_duration > timeout * 0.8:
                logger.debug(f"🐌 HTTP slow: {url} ({probe_duration:.3f}s)")

            if r.status_code in (200, 401, 405):
                return (True, port)
        except Exception:
            pass
        return (False, port)

    # Parallelize HTTP requests across ports and paths
    max_parallel = min(len(ports) * len(ONVIF_PATHS), 12)  # Limit concurrent connections
    with ThreadPoolExecutor(max_workers=max_parallel) as ex:
        futures = []
        for port in ports:
            for path in ONVIF_PATHS:
                futures.append(ex.submit(try_port_path, port, path))

        # Process results as they complete (early exit optimization)
        for fut in as_completed(futures):
            success, port = fut.result()
            if success:
                with found_lock:
                    if port not in found:
                        found.append(port)
                # Early exit: if we found all ports, no need to wait
                if len(found) >= len(ports):
                    break

    return sorted(list(set(found)))


def _rtsp_options_probe(ip: str, ports: List[int], timeout: float) -> List[int]:
    """Optimized RTSP probe with parallelization"""
    found = []
    found_lock = threading.Lock()

    def try_rtsp_port(port: int) -> Tuple[bool, int]:
        """Try a single RTSP port"""
        try:
            probe_start = time.time()
            with socket.create_connection((ip, int(port)), timeout=timeout) as s:
                s.settimeout(timeout)
                # minimal OPTIONS to root path
                payload = f"OPTIONS rtsp://{ip}:{port}/ RTSP/1.0\r\nCSeq: 1\r\n\r\n".encode()
                s.sendall(payload)
                try:
                    data = s.recv(4096)
                except socket.timeout:
                    data = b""

                probe_duration = time.time() - probe_start
                if probe_duration > timeout * 0.8:
                    logger.debug(f"🐌 RTSP slow: {ip}:{port} ({probe_duration:.3f}s)")

                if b"RTSP/1.0" in data or b"Public:" in data or data.startswith(b"RTSP/"):
                    return (True, port)
                else:
                    # If connection succeeded but no response (some servers), still consider port as candidate
                    return (True, port)
        except Exception:
            pass
        return (False, port)

    # Parallelize RTSP port checks
    with ThreadPoolExecutor(max_workers=min(len(ports), 8)) as ex:
        futures = [ex.submit(try_rtsp_port, port) for port in ports]

        for fut in as_completed(futures):
            success, port = fut.result()
            if success:
                with found_lock:
                    found.append(port)

    return sorted(list(set(found)))


def _parse_ports(val, default: List[int]) -> List[int]:
    if isinstance(val, list):
        return [int(p) for p in val]
    if isinstance(val, str) and val.strip():
        parts = [p.strip() for p in val.split(',') if p.strip()]
        out = []
        for p in parts:
            try:
                out.append(int(p))
            except Exception:
                pass
        return out or default
    return default


@app.post("/api/discovery/scan")
async def discovery_scan(payload: dict):
    """
    Scan a CIDR for ONVIF & RTSP candidates.
    Body: {
      cidr?: string (default common subnets),
      onvif_ports?: string|number[],
      rtsp_ports?: string|number[],
      timeout_ms?: number (default 300, reduced from 500),
      max_hosts?: number (default 512)
    }
    """
    scan_start_time = time.time()

    cidr = (payload.get("cidr") or "").strip()
    onvif_ports = _parse_ports(payload.get("onvif_ports"), [80, 8000, 8080, 8899])
    rtsp_ports = _parse_ports(payload.get("rtsp_ports"), [554, 8554, 10554, 7070])
    timeout_ms = int(payload.get("timeout_ms") or 300)  # ⚡ Reduced from 500ms to 300ms
    max_hosts = int(payload.get("max_hosts") or 128)

    nets: List[ipaddress.IPv4Network] = []
    if cidr:
        try:
            nets = [ipaddress.ip_network(cidr, strict=False)]
        except Exception:
            raise HTTPException(status_code=400, detail="CIDR inválido")
    else:
        for guess in ("192.168.1.0/24", "192.168.0.0/24", "10.0.0.0/24"):
            try:
                nets.append(ipaddress.ip_network(guess))
            except Exception:
                pass

    hosts: List[str] = []
    for net in nets:
        for ip in net.hosts():
            hosts.append(str(ip))
            if len(hosts) >= max_hosts:
                break
        if len(hosts) >= max_hosts:
            break

    if not hosts:
        return {"devices": []}

    timeout = max(0.1, timeout_ms / 1000.0)

    hosts_gen_duration = time.time() - scan_start_time
    logger.info(f"⏱️ [SCAN] Host generation: {hosts_gen_duration:.2f}s | Hosts: {len(hosts)}")

    results: Dict[str, Dict[str, Any]] = {}
    lock = threading.Lock()

    def worker(ip: str):
        """Optimized worker with parallel ONVIF and RTSP probing"""
        worker_start = time.time()
        try:
            # ⚡ OPTIMIZATION #1: Parallelize ONVIF and RTSP probes
            with ThreadPoolExecutor(max_workers=2) as probe_ex:
                onvif_future = probe_ex.submit(_http_onvif_probe, ip, onvif_ports, timeout)
                rtsp_future = probe_ex.submit(_rtsp_options_probe, ip, rtsp_ports, timeout)

                onv = onvif_future.result()
                rtsp = rtsp_future.result()

            if onv or rtsp:
                worker_duration = time.time() - worker_start
                logger.info(f"✅ {ip}: {worker_duration:.2f}s | ONVIF={onv} RTSP={rtsp}")
                with lock:
                    results[ip] = {
                        "ip": ip,
                        "onvif_ports": onv,
                        "rtsp_ports": rtsp,
                    }
            else:
                worker_duration = time.time() - worker_start
                if worker_duration > 1.0:
                    logger.debug(f"⏭️ {ip}: {worker_duration:.2f}s (no devices)")
        except Exception as e:
            worker_duration = time.time() - worker_start
            logging.debug(f"❌ scan worker error {ip} ({worker_duration:.2f}s): {e}")

    import os
    # ⚡ OPTIMIZATION #4: More aggressive worker count for I/O-bound operations
    workers = min(os.cpu_count() * 8 if os.cpu_count() else 32, len(hosts), 64)

    logging.info(f"📡 discovery scan: hosts={len(hosts)} timeout={timeout_ms}ms onvif_ports={onvif_ports} rtsp_ports={rtsp_ports} workers={workers}")

    scan_exec_start = time.time()
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(worker, ip) for ip in hosts]
        for _ in as_completed(futs):
            pass

    scan_exec_duration = time.time() - scan_exec_start
    total_duration = time.time() - scan_start_time

    logger.info(f"⏱️ [SCAN] Execution: {scan_exec_duration:.2f}s | Total: {total_duration:.2f}s | Found: {len(results)} devices")

    return {"devices": list(results.values())}


@app.post("/api/discovery/validate")
async def discovery_validate(payload: dict):
    """
    Validate a discovered device.
    Body: { ip, username?, password?, onvif_port?, rtsp_port?, rtsp_path? }
    Returns: { profiles?: [{profile_name, rtsp_uri}], ok?: bool, rtsp_uri?: string }
    """
    ip = (payload.get("ip") or "").strip()
    username = (payload.get("username") or "").strip()
    password = (payload.get("password") or "").strip()
    onvif_port = payload.get("onvif_port")
    rtsp_port = payload.get("rtsp_port")
    rtsp_path = payload.get("rtsp_path") or "/"

    if not ip:
        raise HTTPException(status_code=400, detail="Falta 'ip'")

    # Try ONVIF first if we have a port and the library is available
    if onvif_port and ONVIF_AVAILABLE:
        try:
            cam = ONVIFCamera(ip, int(onvif_port), username or None, password or None)
            media = cam.create_media_service()
            profiles = media.GetProfiles()
            out = []
            for p in profiles:
                token = p.token
                try:
                    uri = media.GetStreamUri({
                        'StreamSetup': {'Stream': 'RTP-Unicast', 'Transport': {'Protocol': 'RTSP'}},
                        'ProfileToken': token
                    }).Uri
                except Exception:
                    uri = None
                if uri and username and password and "@" not in uri and uri.startswith("rtsp://"):
                    rest = uri.split("//", 1)[1]
                    uri = f"rtsp://{username}:{password}@{rest}"
                name = getattr(p, 'Name', None) or getattr(p, 'name', None) or "profile"
                out.append({"profile_name": name, "rtsp_uri": uri})
            return {"profiles": out}
        except Exception as e:
            logging.warning(f"ONVIF validate falló para {ip}:{onvif_port}: {e}")

    # Fall back to RTSP URI construction/testing
    if not rtsp_port:
        raise HTTPException(status_code=400, detail="Falta 'rtsp_port' para validación RTSP")
    # Build an RTSP URI for testing (user/pass optional)
    auth = f"{username}:{password}@" if username and password else ""
    uri = f"rtsp://{auth}{ip}:{int(rtsp_port)}{rtsp_path if str(rtsp_path).startswith('/') else '/' + str(rtsp_path)}"

    # Try a minimal handshake to confirm
    try:
        with socket.create_connection((ip, int(rtsp_port)), timeout=1.0) as s:
            s.settimeout(1.0)
            payload = f"OPTIONS {uri} RTSP/1.0\r\nCSeq: 1\r\n\r\n".encode()
            s.sendall(payload)
            try:
                data = s.recv(4096)
            except socket.timeout:
                data = b""
            ok = (b"RTSP/1.0" in data) or data.startswith(b"RTSP/") or len(data) == 0
            return {"ok": bool(ok), "rtsp_uri": uri}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"RTSP no accesible: {e}")


# --------------- RTSP URL Guessing ---------------
VENDOR_PATHS: Dict[str, List[str]] = {
    "hikvision": [
        "/Streaming/Channels/101",
        "/Streaming/Channels/102",
        "/Streaming/Channels/201",
        "/Streaming/Channels/202",
    ],
    "dahua": [
        "/cam/realmonitor?channel=1&subtype=0",
        "/cam/realmonitor?channel=1&subtype=1",
        "/cam/realmonitor?channel=2&subtype=0",
    ],
    "reolink": [
        "/h264Preview_01_main",
        "/h264Preview_01_sub",
    ],
    "tp-link": [
        "/stream1",
        "/h264",
    ],
    "uniview": [
        "/media/video1",
        "/video1",
    ],
    "ezviz": [
        "/h264",
        "/live",
    ],
    "generic": [
        "/live",
        "/live0",
        "/live1",
        "/ch0_0.h264",
        "/av0_0",
        "/profile1",
        "/profile2",
        "/stream",
    ],
}


def _paths_for_vendor(vendor: str | None, extra: List[str] | None) -> List[str]:
    paths: List[str] = []
    if vendor:
        v = vendor.strip().lower()
        if v in VENDOR_PATHS:
            paths.extend(VENDOR_PATHS[v])
    # Always include generic fallbacks
    paths.extend(VENDOR_PATHS["generic"])  # type: ignore
    if extra:
        for p in extra:
            if p and isinstance(p, str):
                paths.append(p if p.startswith('/') else f"/{p}")
    # Dedupe preserving order
    seen = set()
    out = []
    for p in paths:
        if p not in seen:
            out.append(p)
            seen.add(p)
    return out


def _rtsp_try_uri(uri: str, timeout: float) -> Tuple[bool, int]:
    # Parse ip/port from the URI to open TCP
    try:
        # naive parse
        rest = uri.split("//", 1)[1]
        hostport = rest.split("/", 1)[0]
        if "@" in hostport:
            hostport = hostport.split("@", 1)[1]
        if ":" in hostport:
            host, port = hostport.split(":", 1)
            port = int(port)
        else:
            host, port = hostport, 554
        with socket.create_connection((host, port), timeout=timeout) as s:
            s.settimeout(timeout)
            req = (
                f"DESCRIBE {uri} RTSP/1.0\r\n"
                f"CSeq: 2\r\n"
                f"Accept: application/sdp\r\n\r\n"
            ).encode()
            s.sendall(req)
            try:
                data = s.recv(4096)
            except socket.timeout:
                data = b""
            if data.startswith(b"RTSP/1.0 "):
                try:
                    code = int(data.split(b" ")[1].split(b"\r\n")[0])
                except Exception:
                    code = 0
                return (code in (200, 401, 301, 302)), code
            # Some servers respond slowly; consider connection success as tentative
            return True, 0
    except Exception:
        return False, 0


@app.post("/api/rtsp/guess")
async def rtsp_guess(payload: dict):
    """
    Guess valid RTSP URLs by trying common paths per vendor across given ports.
    Body: { ip, username?, password?, ports?: string|number[], vendor?: string, extra_paths?: string|string[], timeout_ms?: number, max_results?: number }
    """
    ip = (payload.get("ip") or "").strip()
    username = (payload.get("username") or "").strip()
    password = (payload.get("password") or "").strip()
    vendor = (payload.get("vendor") or "").strip() or None
    extra_paths_val = payload.get("extra_paths")
    if isinstance(extra_paths_val, str):
        extra_paths = [s.strip() for s in extra_paths_val.split(',') if s.strip()]
    else:
        extra_paths = extra_paths_val or []

    ports = _parse_ports(payload.get("ports"), [554, 8554, 10554, 7070])
    timeout_ms = int(payload.get("timeout_ms") or 800)
    max_results = int(payload.get("max_results") or 5)

    if not ip:
        raise HTTPException(status_code=400, detail="Falta 'ip'")

    paths = _paths_for_vendor(vendor, extra_paths)
    auth = f"{username}:{password}@" if username and password else (f"{username}@" if username else "")
    timeout = max(0.2, timeout_ms / 1000.0)

    candidates = []
    for port in ports:
        for path in paths:
            uri = f"rtsp://{auth}{ip}:{int(port)}{path}"
            ok, code = _rtsp_try_uri(uri, timeout)
            if ok:
                candidates.append({"uri": uri, "code": code})
                if len(candidates) >= max_results:
                    break
        if len(candidates) >= max_results:
            break

    return {"candidates": candidates}


@app.post("/api/cameras/add")
async def api_add_camera(payload: dict):
    name = (payload.get("name") or "").strip()
    rtsp = (payload.get("rtsp_url") or "").strip()
    if not name or not rtsp:
        raise HTTPException(status_code=400, detail="Faltan 'name' o 'rtsp_url'")
    ok = write_camera_to_config(name, rtsp)
    reloaded = reload_frigate_http() if ok else False
    if ok and not reloaded:
        reloaded = reload_frigate_mqtt()
    return {"added_to_config": ok, "reloaded": reloaded}


# Backward-compatible endpoint used by the UI flow
@app.post("/api/discovery/add")
async def api_discovery_add(payload: dict):
    return await api_add_camera(payload)


def _normalize_rtsp_for_compare(rtsp: str) -> str:
    try:
        if not rtsp:
            return ""
        u = urlparse(rtsp)
        netloc = u.netloc
        if "@" in netloc:
            netloc = netloc.split("@", 1)[1]
        # Lowercase host and scheme, keep path
        hostport = netloc.lower()
        path = u.path or "/"
        return f"{hostport}{path}"
    except Exception:
        return rtsp.lower()


def remove_camera_from_config(name: str, rtsp_url: str | None = None) -> bool:
    try:
        if not os.path.exists(CONFIG_PATH):
            logger.warning("CONFIG_PATH no existe; no se puede escribir config.yml")
            return False
        with open(CONFIG_PATH, 'r') as f:
            cfg = yaml.safe_load(f.read() or "{}") or {}
        cams = cfg.get('cameras') or {}
        if name in cams:
            del cams[name]
            cfg['cameras'] = cams
            with open(CONFIG_PATH, 'w') as f:
                yaml.dump(cfg, f, default_flow_style=False, sort_keys=False)
            logger.info(f"🗑️ Cámara '{name}' eliminada de {CONFIG_PATH}")
            return True
        # Intentar buscar por RTSP si se proporcionó
        if rtsp_url:
            target = _normalize_rtsp_for_compare(rtsp_url)
            for cam_name, cam_conf in list(cams.items()):
                try:
                    inputs = cam_conf.get('ffmpeg', {}).get('inputs', [])
                    for inp in inputs:
                        p = inp.get('path')
                        if p and _normalize_rtsp_for_compare(p) == target:
                            del cams[cam_name]
                            cfg['cameras'] = cams
                            with open(CONFIG_PATH, 'w') as f:
                                yaml.dump(cfg, f, default_flow_style=False, sort_keys=False)
                            logger.info(f"🗑️ Cámara '{cam_name}' (por RTSP) eliminada de {CONFIG_PATH}")
                            return True
                except Exception:
                    continue
        logger.info(f"ℹ️ Cámara '{name}' no estaba en config.yml y no se encontró por RTSP")
        return False
    except Exception as e:
        logger.error(f"❌ Error eliminando cámara de config.yml: {e}")
        return False


@app.post("/api/cameras/delete")
async def api_delete_camera(payload: dict):
    name = (payload.get("name") or "").strip()
    rtsp_url = (payload.get("rtsp_url") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Falta 'name'")
    ok = remove_camera_from_config(name, rtsp_url or None)
    reloaded = reload_frigate_http() if ok else False
    if ok and not reloaded:
        reloaded = reload_frigate_mqtt()
    return {"removed_from_config": ok, "reloaded": reloaded}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    logger.info(f"🚀 Iniciando Frigate Proxy en puerto {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
