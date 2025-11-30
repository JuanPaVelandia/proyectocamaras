# Multi-stage build para el frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Variables de entorno para el build (se pueden pasar como build args)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Construir la aplicación para producción
RUN npm run build

# Stage 2: Servir con Nginx
FROM nginx:alpine

# Copiar los archivos construidos
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

