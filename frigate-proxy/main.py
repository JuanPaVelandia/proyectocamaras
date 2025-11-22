"""
Servicio Proxy Local para Frigate
Este servicio se ejecuta localmente y actúa como puente entre el frontend y Frigate local.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
import logging

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    logger.info(f"🚀 Iniciando Frigate Proxy en puerto {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

