# Dockerfile para Backend (FastAPI)
FROM python:3.10-slim

# Evitar que Python escriba archivos .pyc y buffering en stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar paquetes (si fuera necesario)
# y cliente de postgres (libpq-dev) si usamos psycopg2, aunque asyncpg es pure python a veces requiere deps.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código
COPY . .

# Exponer puerto
EXPOSE 8000

# Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
