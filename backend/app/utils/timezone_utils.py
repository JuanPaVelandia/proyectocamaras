"""
Utilidades para manejo de zonas horarias
"""
import re
from typing import Optional

# Mapeo de códigos de país a timezones (usando nombres IANA)
# Fuente: https://en.wikipedia.org/wiki/List_of_country_calling_codes
COUNTRY_CODE_TO_TIMEZONE = {
    # América
    "1": "America/New_York",  # USA/Canadá (usar el más común)
    "52": "America/Mexico_City",  # México
    "54": "America/Argentina/Buenos_Aires",  # Argentina
    "55": "America/Sao_Paulo",  # Brasil
    "56": "America/Santiago",  # Chile
    "57": "America/Bogota",  # Colombia
    "58": "America/Caracas",  # Venezuela
    "51": "America/Lima",  # Perú
    "593": "America/Guayaquil",  # Ecuador
    "595": "America/Asuncion",  # Paraguay
    "598": "America/Montevideo",  # Uruguay
    "591": "America/La_Paz",  # Bolivia
    "506": "America/Costa_Rica",  # Costa Rica
    "507": "America/Panama",  # Panamá
    "502": "America/Guatemala",  # Guatemala
    "503": "America/El_Salvador",  # El Salvador
    "504": "America/Tegucigalpa",  # Honduras
    "505": "America/Managua",  # Nicaragua
    
    # Europa
    "34": "Europe/Madrid",  # España
    "33": "Europe/Paris",  # Francia
    "49": "Europe/Berlin",  # Alemania
    "44": "Europe/London",  # Reino Unido
    "39": "Europe/Rome",  # Italia
    
    # Asia
    "86": "Asia/Shanghai",  # China
    "91": "Asia/Kolkata",  # India
    "81": "Asia/Tokyo",  # Japón
    
    # Por defecto
    "default": "UTC"
}

def extract_country_code(phone_number: str) -> Optional[str]:
    """
    Extrae el código de país de un número de teléfono internacional.
    
    Ejemplos:
        "+573112264829" -> "57"
        "+1 555 123 4567" -> "1"
        "573112264829" -> "57" (sin +)
    """
    if not phone_number:
        return None
    
    # Remover espacios y caracteres especiales
    cleaned = re.sub(r'[\s\-\(\)]', '', phone_number)
    
    # Si empieza con +, removerlo
    if cleaned.startswith('+'):
        cleaned = cleaned[1:]
    
    # Buscar el código de país más largo primero (para códigos de 2-3 dígitos)
    for length in [3, 2, 1]:
        if len(cleaned) >= length:
            code = cleaned[:length]
            if code in COUNTRY_CODE_TO_TIMEZONE:
                return code
    
    return None

def get_timezone_from_phone(phone_number: Optional[str]) -> str:
    """
    Obtiene el timezone basado en el código de país del teléfono.
    
    Args:
        phone_number: Número de teléfono en formato internacional (ej: "+573112264829")
    
    Returns:
        Nombre del timezone IANA (ej: "America/Bogota") o "UTC" si no se puede detectar
    """
    if not phone_number:
        return "UTC"
    
    country_code = extract_country_code(phone_number)
    if country_code and country_code in COUNTRY_CODE_TO_TIMEZONE:
        return COUNTRY_CODE_TO_TIMEZONE[country_code]
    
    return "UTC"

def convert_local_time_to_utc(local_time_str: str, timezone_name: str) -> str:
    """
    Convierte una hora local (formato HH:MM) a UTC (formato HH:MM).
    
    Args:
        local_time_str: Hora en formato "HH:MM" (ej: "18:00")
        timezone_name: Nombre del timezone IANA (ej: "America/Bogota")
    
    Returns:
        Hora en UTC en formato "HH:MM" (ej: "23:00")
    
    Ejemplo:
        convert_local_time_to_utc("18:00", "America/Bogota") -> "23:00"
        (Colombia es UTC-5, entonces 18:00 local = 23:00 UTC)
    """
    try:
        from datetime import datetime, time
        import pytz
        
        # Si ya es UTC, no convertir
        if timezone_name == "UTC":
            return local_time_str
        
        # Parsear la hora local
        hour, minute = map(int, local_time_str.split(':'))
        local_time = time(hour, minute)
        
        # Obtener timezone
        tz = pytz.timezone(timezone_name)
        
        # Crear datetime con la hora local en el timezone especificado
        # Usamos una fecha arbitraria (hoy) para la conversión
        today = datetime.now(tz).date()
        local_dt = tz.localize(datetime.combine(today, local_time))
        
        # Convertir a UTC
        utc_dt = local_dt.astimezone(pytz.UTC)
        
        # Retornar solo la hora en formato HH:MM
        return utc_dt.strftime("%H:%M")
    except Exception as e:
        # Si hay error, retornar la hora original (fallback)
        import logging
        logging.error(f"Error convirtiendo hora {local_time_str} de {timezone_name} a UTC: {e}")
        return local_time_str

