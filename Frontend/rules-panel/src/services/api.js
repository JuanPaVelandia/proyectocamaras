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

// Función para construir la URL completa con HTTPS garantizado
function buildApiUrl(path) {
  const baseURL = getCorrectBaseURL();
  // Asegurar que path comience con /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseURL}${cleanPath}`;
}

// Crear instancia de axios SIN baseURL
// Usaremos URLs absolutas en cada petición para evitar problemas de Mixed Content
export const api = axios.create({
  // NO usar baseURL - construiremos URLs absolutas directamente
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

// Interceptor para construir URLs absolutas con HTTPS garantizado
api.interceptors.request.use((config) => {
  // Si la URL es relativa (no comienza con http), construir URL absoluta
  if (config.url && !config.url.startsWith('http')) {
    const absoluteUrl = buildApiUrl(config.url);
    config.url = absoluteUrl;
    config.baseURL = ''; // Limpiar baseURL para usar URL absoluta
    console.log('🔗 [INTERCEPTOR] URL construida:', absoluteUrl);
  } else if (config.url && config.url.startsWith('http://') && !config.url.includes('localhost')) {
    // Si la URL es absoluta pero tiene HTTP, forzar HTTPS
    config.url = config.url.replace('http://', 'https://');
    console.warn('⚠️ [INTERCEPTOR] Se corrigió HTTP a HTTPS:', config.url);
  }
  
  // Verificar que la URL final sea HTTPS
  const finalUrl = config.url || config.baseURL;
  if (finalUrl && finalUrl.startsWith('http://') && !finalUrl.includes('localhost')) {
    console.error('❌ [ERROR] La URL todavía tiene HTTP, forzando HTTPS:', finalUrl);
    if (config.url) {
      config.url = finalUrl.replace('http://', 'https://');
    } else {
      config.baseURL = finalUrl.replace('http://', 'https://');
    }
  }
  
  const token = localStorage.getItem("adminToken");
  if (token) {
    // Usar formato estándar Authorization Bearer
    config.headers["Authorization"] = `Bearer ${token}`;
    // También mantener X-Admin-Token para compatibilidad
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
