"""
Servicio de WhatsApp - Arquitectura Simplificada

ARQUITECTURA:
- Un único WhatsApp del admin/sistema envía mensajes a todos los usuarios
- Token y Phone Number ID configurados en variables de entorno:
  * WHATSAPP_TOKEN: Token de acceso del WhatsApp Business API
  * WHATSAPP_PHONE_NUMBER_ID: ID del número de WhatsApp del sistema

- Los usuarios solo necesitan:
  * Registrar su número de WhatsApp (whatsapp_number)
  * Activar notificaciones (whatsapp_notifications_enabled = True)

- El sistema envía notificaciones DESDE el WhatsApp del admin HACIA los usuarios
"""

import os
import logging
import requests
import base64

def send_whatsapp_message(text: str, to_number: str) -> bool:
    """
    Envía mensaje de WhatsApp desde el WhatsApp del sistema al número indicado.

    Args:
        text: Contenido del mensaje
        to_number: Número de WhatsApp destino (del usuario que recibirá la alerta)

    Returns:
        True si se envió exitosamente, False en caso contrario
    """
    token = os.getenv("WHATSAPP_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")

    if not token or not phone_number_id:
        logging.error("❌ Falta WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID en .env")
        return False

    if not to_number:
        logging.error("❌ Número de WhatsApp destino vacío")
        return False

    url = f"https://graph.facebook.com/v17.0/{phone_number_id}/messages"

    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {
            "body": text
        }
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        r = requests.post(url, json=payload, headers=headers)
        logging.info(f"Respuesta WhatsApp status={r.status_code}, body={r.text}")
        if r.status_code in [200, 201]:
            # intenta extraer id de mensaje
            try:
                data = r.json()
                msg_id = data.get("messages", [{}])[0].get("id")
            except Exception:
                msg_id = None
            if msg_id:
                logging.info(f"📤 WhatsApp enviado correctamente. message_id={msg_id}")
            else:
                logging.info("📤 WhatsApp enviado correctamente.")
            return True
        else:
            logging.error(f"❌ Error WhatsApp: {r.status_code} {r.text}")
            return False
    except Exception as e:
        logging.error(f"❌ Excepción enviando WhatsApp: {e}")
        return False


def send_whatsapp_image(image_url: str, caption: str, to_number: str, is_base64: bool = False) -> bool:
    """
    Envía una imagen por WhatsApp.

    Args:
        image_url: URL de la imagen O string base64 si is_base64=True
        caption: Texto del mensaje
        to_number: Número destino
        is_base64: Si True, image_url es un string base64 en lugar de URL
    """
    token = os.getenv("WHATSAPP_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")

    if not token or not phone_number_id:
        logging.error("❌ Falta WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID en .env")
        return False

    if not to_number:
        logging.error("❌ Número de WhatsApp destino vacío")
        return False

    try:
        # Paso 1: Obtener los bytes de la imagen
        if is_base64:
            logging.info(f"📥 Decodificando snapshot desde base64")
            img_content = base64.b64decode(image_url)
        else:
            logging.info(f"📥 Descargando snapshot desde: {image_url}")
            img_response = requests.get(image_url, timeout=10)

            if img_response.status_code != 200:
                logging.error(f"❌ Error descargando snapshot: {img_response.status_code}")
                return send_whatsapp_message(caption, to_number)  # Fallback a mensaje de texto

            img_content = img_response.content

        # Paso 2: Subir la imagen a WhatsApp
        upload_url = f"https://graph.facebook.com/v17.0/{phone_number_id}/media"

        files = {
            'file': ('snapshot.jpg', img_content, 'image/jpeg'),
        }
        
        upload_headers = {
            "Authorization": f"Bearer {token}",
        }
        
        upload_data = {
            "messaging_product": "whatsapp",
            "type": "image/jpeg"
        }
        
        upload_resp = requests.post(upload_url, headers=upload_headers, data=upload_data, files=files)
        logging.info(f"Upload response: {upload_resp.status_code}, {upload_resp.text}")
        
        if upload_resp.status_code not in [200, 201]:
            logging.error(f"❌ Error subiendo imagen: {upload_resp.text}")
            return send_whatsapp_message(caption, to_number)  # Fallback
        
        media_id = upload_resp.json().get("id")
        
        if not media_id:
            logging.error("❌ No se obtuvo media_id")
            return send_whatsapp_message(caption, to_number)  # Fallback
        
        # Paso 3: Enviar mensaje con la imagen
        send_url = f"https://graph.facebook.com/v17.0/{phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "image",
            "image": {
                "id": media_id,
                "caption": caption
            }
        }
        
        send_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        r = requests.post(send_url, json=payload, headers=send_headers)
        logging.info(f"Respuesta WhatsApp (imagen) status={r.status_code}, body={r.text}")
        
        if r.status_code in [200, 201]:
            logging.info(f"📤 WhatsApp con imagen enviado correctamente")
            return True
        else:
            logging.error(f"❌ Error WhatsApp: {r.status_code} {r.text}")
            return False
            
    except Exception as e:
        logging.error(f"❌ Excepción enviando WhatsApp con imagen: {e}")
        return send_whatsapp_message(caption, to_number)  # Fallback a texto
