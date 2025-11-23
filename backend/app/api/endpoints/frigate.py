from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import requests
import logging
import os

from app.api.endpoints.auth import get_current_user
from app.models.all_models import UserDB
from app.db.session import SessionLocal

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# URL de Frigate (desde variable de entorno o por defecto)
FRIGATE_HOST = os.getenv("FRIGATE_HOST", "http://frigate:5000")
FRIGATE_API_URL = f"{FRIGATE_HOST}/api"

# Traducciones de objetos detectables (80 clases COCO)
OBJECT_TRANSLATIONS = {
    # Personas y animales
    "person": "Persona",
    "bicycle": "Bicicleta",
    "car": "Automóvil",
    "motorcycle": "Motocicleta",
    "airplane": "Avión",
    "bus": "Autobús",
    "train": "Tren",
    "truck": "Camión",
    "boat": "Barco",
    "traffic_light": "Semáforo",
    "fire_hydrant": "Hidrante",
    "stop_sign": "Señal de alto",
    "parking_meter": "Parquímetro",
    "bench": "Banco",
    "bird": "Pájaro",
    "cat": "Gato",
    "dog": "Perro",
    "horse": "Caballo",
    "sheep": "Oveja",
    "cow": "Vaca",
    "elephant": "Elefante",
    "bear": "Oso",
    "zebra": "Cebra",
    "giraffe": "Jirafa",
    # Accesorios
    "backpack": "Mochila",
    "umbrella": "Paraguas",
    "handbag": "Bolso",
    "tie": "Corbata",
    "suitcase": "Maleta",
    # Deportes
    "frisbee": "Frisbee",
    "skis": "Esquís",
    "snowboard": "Snowboard",
    "sports_ball": "Pelota deportiva",
    "kite": "Cometa",
    "baseball_bat": "Bate de béisbol",
    "baseball_glove": "Guante de béisbol",
    "skateboard": "Monopatín",
    "surfboard": "Tabla de surf",
    "tennis_racket": "Raqueta de tenis",
    # Utensilios
    "bottle": "Botella",
    "wine_glass": "Copa de vino",
    "cup": "Taza",
    "fork": "Tenedor",
    "knife": "Cuchillo",
    "spoon": "Cuchara",
    "bowl": "Cuenco",
    # Comida
    "banana": "Plátano",
    "apple": "Manzana",
    "sandwich": "Sándwich",
    "orange": "Naranja",
    "broccoli": "Brócoli",
    "carrot": "Zanahoria",
    "hot_dog": "Perro caliente",
    "pizza": "Pizza",
    "donut": "Donut",
    "cake": "Pastel",
    # Muebles
    "chair": "Silla",
    "couch": "Sofá",
    "potted_plant": "Planta en maceta",
    "bed": "Cama",
    "dining_table": "Mesa de comedor",
    "toilet": "Inodoro",
    # Electrónicos
    "tv": "Televisor",
    "laptop": "Portátil",
    "mouse": "Ratón",
    "remote": "Control remoto",
    "keyboard": "Teclado",
    "cell_phone": "Teléfono móvil",
    "microwave": "Microondas",
    "oven": "Horno",
    "toaster": "Tostadora",
    "sink": "Lavabo",
    "refrigerator": "Refrigerador",
    # Otros
    "book": "Libro",
    "clock": "Reloj",
    "vase": "Jarrón",
    "scissors": "Tijeras",
    "teddy_bear": "Osito de peluche",
    "hair_drier": "Secador de pelo",
    "toothbrush": "Cepillo de dientes",
}

# Lista completa de todas las clases COCO (80 objetos)
ALL_COCO_CLASSES = [
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

def get_frigate_config():
    """Obtiene la configuración de Frigate"""
    try:
        response = requests.get(f"{FRIGATE_API_URL}/config", timeout=5)
        if response.status_code == 200:
            return response.json()
        else:
            logger.warning(f"Error obteniendo config de Frigate: {response.status_code}")
            return None
    except Exception as e:
        # No loguear como error si estamos en la nube (es esperado que no pueda conectarse)
        logger.debug(f"Frigate no disponible (esto es normal si el backend está en la nube): {e}")
        return None

@router.get("/cameras")
def get_cameras(
    current_user: UserDB = Depends(get_current_user)
):
    """Obtiene la lista de cámaras disponibles en Frigate (requiere autenticación)"""
    try:
        config = get_frigate_config()
        if not config:
            # Si no se puede obtener de la API, intentar desde eventos
            # Por ahora retornar una lista vacía o valores por defecto
            return {"cameras": []}

        cameras = []
        if "cameras" in config:
            cameras = list(config["cameras"].keys())

        logger.info(f"🔒 Usuario {current_user.username} consultó cámaras de Frigate: {cameras}")
        return {"cameras": cameras}
    except Exception as e:
        logger.error(f"Error obteniendo cámaras: {e}")
        # Retornar lista vacía en caso de error
        return {"cameras": []}

@router.get("/objects")
def get_objects(
    current_user: UserDB = Depends(get_current_user)
):
    """Obtiene la lista completa de objetos detectables en Frigate (80 clases COCO) con sus traducciones (requiere autenticación)"""
    try:
        # Siempre retornar todas las clases COCO disponibles
        objects_with_translations = []
        for obj in ALL_COCO_CLASSES:
            objects_with_translations.append({
                "value": obj,
                "label": OBJECT_TRANSLATIONS.get(obj, obj.replace("_", " ").title())
            })

        # Ordenar alfabéticamente por la traducción en español
        objects_with_translations.sort(key=lambda x: x["label"])

        logger.info(f"Objetos obtenidos: {len(objects_with_translations)} (todas las clases COCO)")
        return {"objects": objects_with_translations}
    except Exception as e:
        logger.error(f"Error obteniendo objetos: {e}")
        # Retornar lista completa en caso de error también
        objects_with_translations = []
        for obj in ALL_COCO_CLASSES:
            objects_with_translations.append({
                "value": obj,
                "label": OBJECT_TRANSLATIONS.get(obj, obj.replace("_", " ").title())
            })
        objects_with_translations.sort(key=lambda x: x["label"])
        return {"objects": objects_with_translations}

