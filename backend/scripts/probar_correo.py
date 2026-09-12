"""Comprueba el envío del correo de recuperación sin usar credenciales reales.

Levanta un servidor SMTP de prueba en 127.0.0.1:1025, apunta la aplicación
hacia él y envía un correo de recuperación. Sirve para verificar que el
mensaje se arma y se transmite bien antes de configurar Gmail.

Uso:
    python scripts/probar_correo.py
"""

import asyncio
import email
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    from aiosmtpd.controller import Controller
except ImportError:
    print('Falta aiosmtpd. Instálalo solo para esta prueba:')
    print('    pip install aiosmtpd')
    raise SystemExit(1)

from app.core import notificaciones
from app.core.configuracion import configuracion

PUERTO = 1025
recibidos = []


class Autenticador:
    """Acepta cualquier usuario: es un servidor de pruebas, no uno real."""

    def __call__(self, servidor, sesion, envelope, mecanismo, credenciales):
        from aiosmtpd.smtp import AuthResult
        return AuthResult(success=True)


class Buzon:
    async def handle_DATA(self, servidor, sesion, envelope):
        recibidos.append(envelope.content.decode('utf-8', errors='replace'))
        return '250 Mensaje recibido'


def main():
    controlador = Controller(
        Buzon(),
        hostname='127.0.0.1',
        port=PUERTO,
        authenticator=Autenticador(),
        auth_require_tls=False,
    )
    controlador.start()
    print(f'Servidor SMTP de prueba escuchando en 127.0.0.1:{PUERTO}\n')

    # Se apunta la aplicación al servidor local, solo durante esta prueba.
    configuracion.smtp_host = '127.0.0.1'
    configuracion.smtp_puerto = PUERTO
    configuracion.smtp_usuario = 'prueba@motoshub.com'
    configuracion.smtp_password = 'clave-de-prueba'
    configuracion.smtp_remitente = 'MotosHub <no-reply@motoshub.com>'
    configuracion.smtp_tls = False
    configuracion.smtp_ssl = False

    print('SMTP configurado:', notificaciones.smtp_configurado())
    enlace = notificaciones.enviar_enlace_recuperacion(
        'destinatario@ejemplo.com', 'Tomas', 'TOKEN_DE_PRUEBA_1234567890abcdef',
    )
    controlador.stop()

    if not recibidos:
        print('\nFALLA: el servidor no recibió ningún mensaje.')
        raise SystemExit(1)

    mensaje = email.message_from_string(recibidos[0])
    print('\n--- correo recibido por el servidor de prueba ---')
    print('De     :', mensaje['From'])
    print('Para   :', mensaje['To'])
    print('Asunto :', mensaje['Subject'])

    partes = {p.get_content_type() for p in mensaje.walk() if not p.is_multipart()}
    print('Partes :', ', '.join(sorted(partes)))

    cuerpo = recibidos[0]
    print('Enlace incluido:', enlace in cuerpo.replace('=\r\n', '').replace('=\n', ''))
    print('\nOK: el correo se arma y se transmite correctamente.')


if __name__ == '__main__':
    asyncio.run(asyncio.sleep(0))  # asegura un bucle disponible en Windows
    main()
