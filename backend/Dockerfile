# Imagen del Backend FastAPI.
#
# Alternativa a Nixpacks para plataformas que despliegan con Docker
# (Render, Fly.io, Google Cloud Run, un VPS propio...).
FROM python:3.12-slim

# Evita que Python escriba .pyc y deje la salida en buffer, que en los logs de
# la plataforma se traduce en mensajes que llegan tarde o no llegan.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Las dependencias se copian primero para que Docker reutilice esta capa
# mientras no cambie requirements.txt.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# La aplicacion no necesita privilegios de root.
RUN useradd --create-home --shell /bin/bash motoshub && chown -R motoshub:motoshub /app
USER motoshub

EXPOSE 8000

# La plataforma define PORT; en local se queda en 8000.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
