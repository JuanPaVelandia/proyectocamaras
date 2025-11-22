FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY listener.py /app/

CMD ["python", "-u", "/app/listener.py"]
