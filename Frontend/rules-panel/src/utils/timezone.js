/**
 * Utilidades para conversión de timezone
 * Convierte entre UTC (guardado en BD) y hora local del usuario
 */

/**
 * Convierte una hora UTC a hora local del usuario
 * @param {string} utcTime - Hora en formato "HH:MM" en UTC
 * @param {string} timezone - Timezone del usuario (ej: "America/Bogota")
 * @returns {string} Hora en formato "HH:MM" en hora local
 */
export function convertUTCToLocal(utcTime, timezone) {
    if (!utcTime || !timezone || timezone === 'UTC') {
        return utcTime;
    }

    try {
        // Crear fecha de hoy con la hora UTC
        const [hours, minutes] = utcTime.split(':').map(Number);
        const today = new Date();
        const utcDate = new Date(Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate(),
            hours,
            minutes
        ));

        // Obtener la hora en el timezone del usuario usando Intl.DateTimeFormat
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        const parts = formatter.formatToParts(utcDate);
        const localHours = parts.find(p => p.type === 'hour').value;
        const localMinutes = parts.find(p => p.type === 'minute').value;
        
        const result = `${localHours}:${localMinutes}`;
        console.log(`[convertUTCToLocal] ${utcTime} (UTC) → ${result} (${timezone})`);
        
        return result;
    } catch (error) {
        console.error('Error converting UTC to local:', error);
        return utcTime;
    }
}

/**
 * Obtiene el offset en minutos del timezone especificado para una fecha dada
 * @param {string} timezone - Timezone (ej: "America/Bogota")
 * @param {Date} date - Fecha para calcular el offset (puede variar por DST)
 * @returns {number} Offset en minutos (positivo si el timezone está detrás de UTC)
 */
function getTimezoneOffsetMinutes(timezone, date = new Date()) {
    // Método más confiable: usar Intl.DateTimeFormat para obtener el offset
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    // La diferencia es cuántos minutos hay entre UTC y el timezone
    // Si el timezone está detrás de UTC (ej: UTC-5), el offset será positivo
    const diffMs = utcDate.getTime() - tzDate.getTime();
    return diffMs / (1000 * 60);
}

/**
 * Convierte una hora local del usuario a UTC
 * @param {string} localTime - Hora en formato "HH:MM" en hora local
 * @param {string} timezone - Timezone del usuario (ej: "America/Bogota")
 * @returns {string} Hora en formato "HH:MM" en UTC
 */
export function convertLocalToUTC(localTime, timezone) {
    if (!localTime || !timezone || timezone === 'UTC') {
        return localTime;
    }

    try {
        const [hours, minutes] = localTime.split(':').map(Number);
        const today = new Date();
        
        // Obtener la fecha actual en el timezone del usuario
        const tzFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        const tzDateParts = tzFormatter.formatToParts(today);
        const tzYear = parseInt(tzDateParts.find(p => p.type === 'year').value);
        const tzMonth = parseInt(tzDateParts.find(p => p.type === 'month').value) - 1;
        const tzDay = parseInt(tzDateParts.find(p => p.type === 'day').value);
        
        // Crear una fecha que represente "hoy a las X horas" en el timezone del usuario
        // Para esto, creamos una fecha ISO string y la interpretamos
        const dateStr = `${tzYear}-${String(tzMonth + 1).padStart(2, '0')}-${String(tzDay).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
        
        // Crear una fecha que represente esta hora en el timezone del usuario
        // Usamos un método indirecto: crear una fecha de referencia y calcular el offset
        const referenceDate = new Date(dateStr + 'Z'); // Interpretar como UTC primero
        const offsetMinutes = getTimezoneOffsetMinutes(timezone, referenceDate);
        
        // Ajustar: si el timezone está UTC-5, el offset es +300 minutos
        // Para convertir de local a UTC, sumamos el offset
        const utcTime = referenceDate.getTime() + (offsetMinutes * 60 * 1000);
        const utcDate = new Date(utcTime);
        
        const utcHours = String(utcDate.getUTCHours()).padStart(2, '0');
        const utcMinutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
        
        console.log(`[convertLocalToUTC] ${localTime} (${timezone}) → ${utcHours}:${utcMinutes} (UTC) - offset: ${offsetMinutes} min`);
        
        return `${utcHours}:${utcMinutes}`;
    } catch (error) {
        console.error('Error converting local to UTC:', error);
        return localTime;
    }
}

/**
 * Obtiene el timezone del usuario desde localStorage o del backend
 * @returns {Promise<string>} Timezone del usuario o 'UTC' por defecto
 */
export async function getUserTimezone() {
    try {
        // Intentar obtener desde localStorage primero
        const userData = localStorage.getItem('userData');
        if (userData) {
            const parsed = JSON.parse(userData);
            if (parsed.timezone) {
                return parsed.timezone;
            }
        }

        // Si no está en localStorage, obtener del backend
        const { api } = await import('../services/api');
        const response = await api.get('/api/auth/me');
        const timezone = response.data.timezone || 'UTC';
        
        // Guardar en localStorage para futuras consultas
        if (userData) {
            const updated = JSON.parse(userData);
            updated.timezone = timezone;
            localStorage.setItem('userData', JSON.stringify(updated));
        }
        
        return timezone;
    } catch (error) {
        console.error('Error getting user timezone:', error);
        return 'UTC';
    }
}

