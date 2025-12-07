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
        
        // Método más directo: crear una fecha que represente la hora local
        // y usar toLocaleString para ver cómo se representa en UTC
        // Primero, crear una fecha ISO en el timezone local del navegador
        const localDate = new Date(tzYear, tzMonth, tzDay, hours, minutes);
        
        // Obtener cómo se representa esta fecha en el timezone del usuario
        const tzDateStr = localDate.toLocaleString('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        // Parsear la fecha en el timezone del usuario
        const [tzDatePart, tzTimePart] = tzDateStr.split(', ');
        const [tzMonthStr, tzDayStr, tzYearStr] = tzDatePart.split('/');
        const [tzHour, tzMinute] = tzTimePart.split(':').map(Number);
        
        // Calcular el offset: diferencia entre la fecha local y cómo se ve en el timezone
        const tzUTC = Date.UTC(parseInt(tzYearStr), parseInt(tzMonthStr) - 1, parseInt(tzDayStr), tzHour, tzMinute);
        const localUTC = Date.UTC(tzYear, tzMonth, tzDay, hours, minutes);
        
        // El offset es la diferencia
        const offsetMs = tzUTC - localUTC;
        
        // Aplicar el offset para obtener UTC
        const utcTime = localUTC + offsetMs;
        const utcDate = new Date(utcTime);
        
        const utcHours = String(utcDate.getUTCHours()).padStart(2, '0');
        const utcMinutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
        
        console.log(`[convertLocalToUTC] ${localTime} (${timezone}) → ${utcHours}:${utcMinutes} (UTC) - offset: ${offsetMs / (60 * 1000)} min`);
        
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

