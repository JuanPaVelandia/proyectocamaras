# Frigate Local Proxy

Servicio proxy local que actúa como puente entre el frontend y Frigate local.

## ¿Qué hace?

Este servicio se ejecuta localmente y permite que el frontend obtenga información de Frigate (como la lista de cámaras) sin que el backend en la nube necesite acceder directamente a Frigate.

## Instalación

1. Instala las dependencias:
```bash
pip install -r requirements.txt
```

2. Ejecuta el servicio:
```bash
python main.py
```

El servicio estará disponible en `http://localhost:8001`

## Configuración

Puedes configurar la URL de Frigate usando la variable de entorno:
```bash
export FRIGATE_HOST=http://localhost:5000
python main.py
```

## Endpoints

- `GET /health` - Health check
- `GET /api/frigate/cameras` - Obtiene la lista de cámaras desde Frigate local
- `GET /api/frigate/objects` - Retorna la lista de objetos COCO (80 clases)

