# Dockerfile para Backend (FastAPI)
FROM python:3.10-slim

# Evitar que Python escriba archivos .pyc y buffering en stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema
# libpq-dev: necesaria para psycopg2
# netcat-openbsd: útil para scripts de espera (opcional, pero recomendado)
# dos2unix: para corregir saltos de línea en scripts creados en Windows
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código
COPY . .

# Preparar script de entrada
COPY entrypoint.sh .
RUN dos2unix entrypoint.sh && chmod +x entrypoint.sh

# Exponer puerto
EXPOSE 8000

# Usar el script de entrada
CMD ["./entrypoint.sh"]
