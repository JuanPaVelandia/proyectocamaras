import axios from "axios";

// Función helper para obtener la URL del API siempre con HTTPS en producción
function getApiBaseUrl() {
  let apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
  
  // Asegurar que en producción siempre use HTTPS
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    // Si estamos en HTTPS (Vercel), forzar que la API también use HTTPS
    if (apiBase.startsWith('http://') && !apiBase.includes('localhost')) {
      apiBase = apiBase.replace('http://', 'https://');
      console.warn('⚠️ Se corrigió la URL del API a HTTPS:', apiBase);
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
  let base = API_BASE;
  
  // Forzar HTTPS en producción
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (base.startsWith('http://') && !base.includes('localhost')) {
      base = base.replace('http://', 'https://');
      console.warn('⚠️ Se corrigió el baseURL a HTTPS:', base);
    }
  }
  
  return base;
}

// Crear instancia de axios con baseURL que se actualiza dinámicamente
export const api = axios.create({
  baseURL: getCorrectBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 segundos de timeout
});

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
  // Actualizar baseURL en cada petición para asegurar HTTPS
  const correctBaseURL = getCorrectBaseURL();
  if (config.baseURL !== correctBaseURL) {
    config.baseURL = correctBaseURL;
    console.warn('⚠️ Se actualizó el baseURL a HTTPS:', correctBaseURL);
  }
  
  // También verificar la URL completa si es absoluta
  if (config.url && config.url.startsWith('http://') && !config.url.includes('localhost')) {
    config.url = config.url.replace('http://', 'https://');
    console.warn('⚠️ Se corrigió la URL de la petición a HTTPS:', config.url);
  }
  
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers["X-Admin-Token"] = token;
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
