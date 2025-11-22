import axios from "axios";

// En desarrollo: localhost
// En producción: se usa la variable de entorno VITE_API_URL
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use((config) => {
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
