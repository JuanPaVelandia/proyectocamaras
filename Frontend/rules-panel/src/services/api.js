import axios from "axios";

// Función helper para obtener la URL del API siempre con HTTPS en producción
function getApiBaseUrl() {
  // En producción (Vercel), construir la URL directamente con HTTPS
  // NO depender de la variable de entorno que puede estar mal configurada
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname.includes('vercel.app') || 
                         window.location.hostname.includes('railway.app') ||
                         (window.location.protocol === 'https:' && !window.location.hostname.includes('localhost'));
    
    if (isProduction) {
      // En producción, SIEMPRE usar el backend de Railway con HTTPS
      // Extraer el dominio de la variable de entorno si existe, sino usar el dominio por defecto
      let domain = 'proyectocamaras-production.up.railway.app';
      
      const envUrl = import.meta.env.VITE_API_URL;
      if (envUrl) {
        // Extraer el dominio de la variable de entorno
        const extractedDomain = envUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (extractedDomain && !extractedDomain.includes('localhost')) {
          domain = extractedDomain;
        }
      }
      
      const apiBase = `https://${domain}`;
      console.warn('🔒 [PRODUCCIÓN] URL del API construida con HTTPS:', apiBase);
      return apiBase;
    }
  }
  
  // En desarrollo, usar la variable de entorno o localhost
  return import.meta.env.VITE_API_URL || "http://localhost:8000";
}

// En desarrollo: localhost
// En producción: se usa la variable de entorno VITE_API_URL (siempre con HTTPS)
const API_BASE = getApiBaseUrl();

// Exportar la función para que otros archivos la usen
export function getApiBase() {
  return getApiBaseUrl();
}

// Log para debug
if (typeof window !== 'undefined') {
  console.log('🔗 URL del API configurada:', API_BASE);
  console.log('🔗 Variable de entorno VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('🔗 URL corregida (con HTTPS si es necesario):', getCorrectBaseURL());
}

// URL del proxy local de Frigate (solo en desarrollo/localhost)
const FRIGATE_PROXY_URL = import.meta.env.VITE_FRIGATE_PROXY_URL || "http://localhost:8001";

// Detectar si estamos en desarrollo (localhost) o producción
// En producción (Vercel), siempre usar HTTPS y dominios como *.vercel.app
const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   (window.location.protocol === 'http:' && !window.location.hostname.includes('vercel.app')));

// Log para debug (solo en desarrollo)
if (typeof window !== 'undefined' && isDevelopment) {
  console.log('🔧 Modo desarrollo detectado:', {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    isDevelopment
  });
} else if (typeof window !== 'undefined') {
  console.log('🌐 Modo producción detectado:', {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    isDevelopment
  });
}

// Función para obtener el baseURL correcto (siempre HTTPS en producción)
function getCorrectBaseURL() {
  // Usar la misma lógica que getApiBaseUrl para asegurar consistencia
  return getApiBaseUrl();
}

// Crear instancia de axios - el baseURL se establecerá dinámicamente
export const api = axios.create({
  // NO establecer baseURL aquí, se establecerá dinámicamente en el interceptor
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 segundos de timeout
});

// Establecer baseURL dinámicamente después de crear la instancia
// Esto se ejecuta en tiempo de ejecución, no en tiempo de build
if (typeof window !== 'undefined') {
  const correctURL = getCorrectBaseURL();
  api.defaults.baseURL = correctURL;
  console.warn('🔒 [RUNTIME] api.defaults.baseURL establecido a:', correctURL);
}

// API para el proxy local de Frigate (solo para cámaras y objetos)
// Solo se usa en desarrollo, en producción siempre usa el backend de Railway
export const frigateProxy = axios.create({
  baseURL: FRIGATE_PROXY_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 5000, // 5 segundos de timeout (más corto porque es local)
});

// Exportar flag para saber si estamos en desarrollo
export const IS_DEVELOPMENT = isDevelopment;

// Interceptor para agregar token automáticamente y forzar HTTPS en cada petición
api.interceptors.request.use((config) => {
  // SIEMPRE establecer el baseURL correcto en cada petición
  // Esto asegura que incluso si el código compilado tiene HTTP, se corrija en runtime
  const correctBaseURL = getCorrectBaseURL();
  config.baseURL = correctBaseURL;
  
  // Si la URL es absoluta y tiene HTTP, corregirla
  if (config.url && config.url.startsWith('http://') && !config.url.includes('localhost')) {
    config.url = config.url.replace('http://', 'https://');
    console.warn('⚠️ [INTERCEPTOR] Se corrigió la URL absoluta a HTTPS:', config.url);
  }
  
  // Construir la URL completa para verificar
  const fullUrl = config.url 
    ? (config.url.startsWith('http') ? config.url : `${config.baseURL}${config.url}`)
    : config.baseURL;
  
  // Si la URL completa tiene HTTP, forzar HTTPS
  if (fullUrl && fullUrl.startsWith('http://') && !fullUrl.includes('localhost')) {
    const correctedUrl = fullUrl.replace('http://', 'https://');
    // Si la URL es absoluta, usar la URL corregida directamente
    if (config.url && config.url.startsWith('http')) {
      config.url = correctedUrl;
      config.baseURL = '';
    } else {
      // Si es relativa, actualizar el baseURL
      const urlPath = config.url || '';
      config.baseURL = correctedUrl.replace(urlPath, '').replace(/\/$/, '');
    }
    console.warn('⚠️ [INTERCEPTOR] Se corrigió la URL completa a HTTPS:', correctedUrl);
  }
  
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers["X-Admin-Token"] = token;
  }
  
  // Log final para debug
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    const finalUrl = config.url 
      ? (config.url.startsWith('http') ? config.url : `${config.baseURL || ''}${config.url}`)
      : config.baseURL;
    console.log('🔍 [INTERCEPTOR] Petición final:', {
      baseURL: config.baseURL,
      url: config.url,
      finalUrl: finalUrl
    });
    
    // Verificar una última vez que no tenga HTTP
    if (finalUrl && finalUrl.startsWith('http://') && !finalUrl.includes('localhost')) {
      console.error('❌ [ERROR] La URL final todavía tiene HTTP:', finalUrl);
      // Forzar HTTPS una última vez
      config.baseURL = finalUrl.replace('http://', 'https://').replace(config.url || '', '').replace(/\/$/, '');
      console.warn('🔒 [ÚLTIMO INTENTO] Se forzó HTTPS:', config.baseURL);
    }
  }
  
  return config;
});

// Interceptor para manejar errores globales (ej. 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Opcional: Redirigir a login o limpiar token
      // localStorage.removeItem("adminToken");
      // window.location.href = "/";
    }
    return Promise.reject(error);
  }
);
