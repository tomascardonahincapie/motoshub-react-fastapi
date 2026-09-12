"""Envío del enlace de recuperación de contraseña.

En este avance el proyecto no tiene servidor de correo configurado, así que el
enlace se escribe en la consola donde corre uvicorn. Esa es la única parte
simulada del flujo: el token, su vigencia, el uso único y el cambio de
contraseña sí funcionan de verdad contra la base de datos.

Para enviarlo por correo de verdad basta con reemplazar el cuerpo de
`enviar_enlace_recuperacion` por una llamada al proveedor de correo
(smtplib, SendGrid, Resend...), sin tocar el resto de la aplicación.
"""

import logging

from app.core.configuracion import configuracion

logger = logging.getLogger('motoshub.correo')


def construir_enlace(token: str) -> str:
    """Arma la URL del Frontend donde el usuario define su nueva contraseña."""
    return f'{configuracion.url_frontend.rstrip("/")}/restablecer/{token}'


def enviar_enlace_recuperacion(email: str, nombres: str, token: str) -> str:
    """Deja el enlace en el registro del servidor y lo devuelve."""
    enlace = construir_enlace(token)

    logger.info(
        '\n'
        '========================================================================\n'
        ' RECUPERACION DE CONTRASENA\n'
        ' Para: %s (%s)\n'
        ' Vigencia: %s minutos, un solo uso\n'
        '\n'
        ' %s\n'
        '========================================================================',
        nombres, email, configuracion.recuperacion_expira_minutos, enlace,
    )
    return enlace
