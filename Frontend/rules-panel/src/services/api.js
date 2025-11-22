import axios from "axios";

// Función helper para obtener la URL del API siempre con HTTPS en producción
function getApiBaseUrl() {
  let apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
  
  // SIEMPRE forzar HTTPS en producción (Vercel), sin importar qué tenga la variable
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname.includes('vercel.app') || 
                         window.location.hostname.includes('railway.app') ||
                         window.location.protocol === 'https:';
    
    if (isProduction) {
      // Si estamos en producción, SIEMPRE usar HTTPS
      // Extraer el dominio sin importar si viene con http:// o https://
      let domain = apiBase.replace(/^https?:\/\//, '').replace(/\/$/, '');
      
      // Si no es localhost, forzar HTTPS
      if (!domain.includes('localhost') && !domain.includes('127.0.0.1')) {
        apiBase = `https://${domain}`;
        console.warn('🔒 [FORZADO] URL del API forzada a HTTPS en producción:', apiBase);
      }
    } else if (window.location.protocol === 'https:') {
      // Si estamos en HTTPS pero no en producción (desarrollo con HTTPS), también forzar
      if (apiBase.startsWith('http://') && !apiBase.includes('localhost')) {
        apiBase = apiBase.replace('http://', 'https://');
        console.warn('⚠️ Se corrigió la URL del API a HTTPS:', apiBase);
      }
    }
  }
  
  return apiBase;
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

// Crear instancia de axios con baseURL que se actualiza dinámicamente
const initialBaseURL = getCorrectBaseURL();
export const api = axios.create({
  baseURL: initialBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 segundos de timeout
});

// Forzar actualización del baseURL después de crear la instancia
if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  const correctURL = getCorrectBaseURL();
  if (api.defaults.baseURL !== correctURL) {
    api.defaults.baseURL = correctURL;
    console.warn('⚠️ Se actualizó api.defaults.baseURL a HTTPS:', correctURL);
  }
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
  // SIEMPRE forzar HTTPS en producción, sin importar qué tenga config.baseURL
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    const correctBaseURL = getCorrectBaseURL();
    
    // Reemplazar baseURL si contiene HTTP (no localhost)
    if (config.baseURL && config.baseURL.startsWith('http://') && !config.baseURL.includes('localhost')) {
      config.baseURL = config.baseURL.replace('http://', 'https://');
      console.warn('⚠️ [INTERCEPTOR] Se corrigió el baseURL a HTTPS:', config.baseURL);
    }
    
    // También forzar el baseURL correcto si es diferente
    if (config.baseURL !== correctBaseURL && !config.baseURL.includes('localhost')) {
      config.baseURL = correctBaseURL;
      console.warn('⚠️ [INTERCEPTOR] Se actualizó el baseURL a:', config.baseURL);
    }
    
    // Construir la URL completa y verificar
    const fullUrl = config.url 
      ? (config.url.startsWith('http') ? config.url : `${config.baseURL}${config.url}`)
      : config.baseURL;
    
    if (fullUrl && fullUrl.startsWith('http://') && !fullUrl.includes('localhost')) {
      const correctedUrl = fullUrl.replace('http://', 'https://');
      // Si la URL es absoluta, reemplazarla directamente
      if (config.url && config.url.startsWith('http://')) {
        config.url = correctedUrl;
      } else {
        // Si es relativa, actualizar el baseURL
        config.baseURL = correctedUrl.replace(config.url || '', '');
      }
      console.warn('⚠️ [INTERCEPTOR] Se corrigió la URL completa a HTTPS:', correctedUrl);
    }
  }
  
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers["X-Admin-Token"] = token;
  }
  
  // Log final para debug
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    console.log('🔍 [INTERCEPTOR] Petición final:', {
      baseURL: config.baseURL,
      url: config.url,
      fullUrl: config.url ? (config.url.startsWith('http') ? config.url : `${config.baseURL}${config.url}`) : config.baseURL
    });
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
