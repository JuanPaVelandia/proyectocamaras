# Guía de Instalación en Cliente Nuevo (Vidria)

Esta guía explica cómo desplegar el sistema en un nuevo pc de cliente, configurando su ID único y conectando las cámaras.

## 1. Descargar el Código
Clona el repositorio o descomprime el ZIP con la última versión del código en la carpeta deseada (ej: `C:\Vidria`).

## 2. Configurar Identificadores y Claves
Como cada cliente es único, debemos configurar su ID manualmente en el archivo `docker-compose.yml`.

1. Abre el archivo `docker-compose.yml` con un editor de texto (Notepad, VS Code, etc).
2. Busca el servicio **`listener`** y edita la sección `environment`:

```yaml
  listener:
    # ...
    environment:
      - CUSTOMER_ID=nombre_del_cliente_aqui   <--- CAMBIAR ESTO (ej: secadora)
      - SITE_ID=nombre_de_sede_aqui           <--- CAMBIAR ESTO (ej: planta_1) (Opcional)
      - CLOUD_API_KEY=tu_clave_secreta_aqui   <--- PEGAR CLAVE API
      - MQTT_HOST=mosquitto
```

3. Busca el servicio **`backend`** y asegúrate de que tenga la **MISMA** clave API:

```yaml
  backend:
    # ...
    environment:
      - API_KEY=tu_clave_secreta_aqui         <--- PEGAR MISMA CLAVE API
      # ...
```

> **Nota:** No hace falta crear archivos `.env`, Docker tomará estos valores directamente.

## 3. Configurar Cámaras
Edita el archivo `config/config.yml` para añadir las cámaras IP del cliente.

**Importante:** Respeta la indentación (espacios) estrictamente.

```yaml
cameras:
  # Cámara 1
  nombre_camara_1:
    ffmpeg:
      inputs:
        - path: rtsp://usuario:password@192.168.1.50:554/stream
          roles:
            - detect
            - record
    detect:
      width: 1920
      height: 1080
      fps: 5
    # ... resto de configuración ...

  # Cámara 2 (Alineada verticalmente con la anterior)
  nombre_camara_2:
    ffmpeg: ...
```

## 4. Iniciar el Sistema
Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
docker-compose up -d --build
```

- Esto descargará las imágenes, construirá el código y levantará los servicios (`frigate`, `backend`, `listener`, `mqtt`, `db`).
- Si modificas el código o `docker-compose.yml` en el futuro, vuelve a ejecutar este mismo comando.

## 5. Verificación
Para confirmar que todo funciona y los eventos se envían con el ID del cliente:

1. **Verificar Frigate:** Entra a `http://localhost:5000` en el navegador. Deberías ver las cámaras.
2. **Verificar Envío de Eventos:** Mira los logs del listener:

```bash
docker logs -f frigate_listener
```

Debes ver mensajes como:
`📥 Evento normalizado: customer=nombre_del_cliente ...`

Si ves eso, ¡el despliegue ha sido exitoso!
