"""Middlewares HTTP: registro de peticiones y cabeceras de seguridad."""

import logging
import time
import uuid

from fastapi import Request

logger = logging.getLogger('motoshub.peticiones')


async def registrar_peticion(peticion: Request, call_next):
    """Deja en consola cada peticion con su metodo, ruta, estado y duracion."""
    identificador = str(uuid.uuid4())[:8]
    inicio = time.perf_counter()
    respuesta = await call_next(peticion)
    duracion_ms = (time.perf_counter() - inicio) * 1000
    logger.info(
        '[%s] %s %s -> %s (%.1f ms)',
        identificador, peticion.method, peticion.url.path, respuesta.status_code, duracion_ms,
    )
    respuesta.headers['X-Peticion-Id'] = identificador
    respuesta.headers['X-Tiempo-Respuesta-ms'] = f'{duracion_ms:.1f}'
    return respuesta


async def cabeceras_de_seguridad(peticion: Request, call_next):
    """Agrega cabeceras basicas de proteccion a todas las respuestas."""
    respuesta = await call_next(peticion)
    respuesta.headers.setdefault('X-Content-Type-Options', 'nosniff')
    respuesta.headers.setdefault('X-Frame-Options', 'DENY')
    respuesta.headers.setdefault('Referrer-Policy', 'no-referrer')
    return respuesta
