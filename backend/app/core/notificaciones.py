"""Envío del correo de recuperación de contraseña.

Si hay un servidor SMTP configurado en el archivo .env, el enlace se envía por
correo de verdad. Si no lo hay, se escribe en la consola donde corre uvicorn,
para que el flujo siga siendo probable en desarrollo sin montar nada.

Un fallo al enviar nunca rompe la petición: se registra el error y el enlace
queda igualmente en el log, porque al usuario se le responde siempre lo mismo
exista o no su correo.
"""

import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.configuracion import configuracion

logger = logging.getLogger('motoshub.correo')


def construir_enlace(token: str) -> str:
    """Arma la URL del Frontend donde el usuario define su nueva contraseña."""
    return f'{configuracion.url_frontend.rstrip("/")}/restablecer/{token}'


def smtp_configurado() -> bool:
    """Hay servidor de correo si están el host y las credenciales."""
    return bool(configuracion.smtp_host and configuracion.smtp_usuario and configuracion.smtp_password)


# ---------------------------------------------------------------------------
# Contenido del correo
# ---------------------------------------------------------------------------
def _cuerpo_texto(nombres: str, enlace: str, minutos: int) -> str:
    return (
        f'Hola {nombres},\n\n'
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta en MotosHub.\n\n'
        'Abre este enlace para crear una nueva:\n'
        f'{enlace}\n\n'
        f'El enlace vence en {minutos} minutos y solo puede usarse una vez.\n\n'
        'Si no fuiste tú, puedes ignorar este mensaje: tu contraseña no cambiará.\n\n'
        '— MotosHub'
    )


def _cuerpo_html(nombres: str, enlace: str, minutos: int) -> str:
    return f"""<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#06070a;
  font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#d7dce6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#06070a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:520px;background:#0f1219;border:1px solid #232936;border-radius:16px;overflow:hidden;">

        <tr><td style="padding:26px 32px 0;">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:3px;
                    text-transform:uppercase;color:#ff5c1a;">MotosHub</p>
        </td></tr>

        <tr><td style="padding:18px 32px 0;">
          <h1 style="margin:0;font-size:23px;color:#f7f9fc;">Restablece tu contraseña</h1>
          <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#9aa3b5;">
            Hola <strong style="color:#d7dce6;">{nombres}</strong>, recibimos una solicitud
            para restablecer la contraseña de tu cuenta.
          </p>
        </td></tr>

        <tr><td align="center" style="padding:26px 32px 0;">
          <a href="{enlace}"
             style="display:inline-block;background:#ff5c1a;color:#ffffff;text-decoration:none;
                    font-weight:700;font-size:14px;letter-spacing:.5px;text-transform:uppercase;
                    padding:14px 30px;border-radius:10px;">Crear nueva contraseña</a>
        </td></tr>

        <tr><td style="padding:22px 32px 0;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#7a8294;">
            El enlace vence en <strong style="color:#ffa574;">{minutos} minutos</strong>
            y solo puede usarse una vez.
          </p>
          <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#5b6273;">
            Si el botón no funciona, copia esta dirección en tu navegador:<br>
            <span style="color:#9aa3b5;word-break:break-all;">{enlace}</span>
          </p>
        </td></tr>

        <tr><td style="padding:22px 32px 28px;">
          <div style="border-top:1px solid #232936;padding-top:18px;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#5b6273;">
              Si no solicitaste este cambio, ignora este mensaje: tu contraseña no se
              modificará.
            </p>
          </div>
        </td></tr>

      </table>
      <p style="margin:18px 0 0;font-size:11px;color:#5b6273;">
        MotosHub · Este correo se envió automáticamente, no respondas a esta dirección.
      </p>
    </td></tr>
  </table>
</body></html>"""


def _armar_mensaje(email: str, nombres: str, enlace: str) -> EmailMessage:
    minutos = configuracion.recuperacion_expira_minutos

    mensaje = EmailMessage()
    mensaje['Subject'] = 'Restablece tu contraseña de MotosHub'
    mensaje['From'] = configuracion.smtp_remitente or configuracion.smtp_usuario
    mensaje['To'] = email
    mensaje.set_content(_cuerpo_texto(nombres, enlace, minutos))
    mensaje.add_alternative(_cuerpo_html(nombres, enlace, minutos), subtype='html')
    return mensaje


# ---------------------------------------------------------------------------
# Envío
# ---------------------------------------------------------------------------
def _registrar_en_consola(email: str, nombres: str, enlace: str, motivo: str) -> None:
    logger.info(
        '\n'
        '========================================================================\n'
        ' RECUPERACION DE CONTRASENA  (%s)\n'
        ' Para: %s (%s)\n'
        ' Vigencia: %s minutos, un solo uso\n'
        '\n'
        ' %s\n'
        '========================================================================',
        motivo, nombres, email, configuracion.recuperacion_expira_minutos, enlace,
    )


def enviar_enlace_recuperacion(email: str, nombres: str, token: str) -> str:
    """Envía el enlace por correo si hay SMTP; si no, lo deja en la consola."""
    enlace = construir_enlace(token)

    if not smtp_configurado():
        _registrar_en_consola(email, nombres, enlace, 'sin SMTP configurado')
        return enlace

    try:
        mensaje = _armar_mensaje(email, nombres, enlace)
        contexto = ssl.create_default_context()

        if configuracion.smtp_ssl:
            # Puerto 465: la conexión va cifrada desde el inicio.
            with smtplib.SMTP_SSL(configuracion.smtp_host, configuracion.smtp_puerto,
                                  context=contexto, timeout=20) as servidor:
                servidor.login(configuracion.smtp_usuario, configuracion.smtp_password)
                servidor.send_message(mensaje)
        else:
            # Puerto 587: se abre en claro y se cifra con STARTTLS.
            with smtplib.SMTP(configuracion.smtp_host, configuracion.smtp_puerto,
                              timeout=20) as servidor:
                servidor.ehlo()
                if configuracion.smtp_tls:
                    servidor.starttls(context=contexto)
                    servidor.ehlo()
                servidor.login(configuracion.smtp_usuario, configuracion.smtp_password)
                servidor.send_message(mensaje)

        logger.info('Correo de recuperación enviado a %s', email)

    except smtplib.SMTPAuthenticationError:
        logger.error(
            'El servidor de correo rechazó las credenciales. Revisa SMTP_USUARIO y '
            'SMTP_PASSWORD en el archivo .env. Con Gmail debe ser una contraseña de '
            'aplicación, no la del correo.',
        )
        _registrar_en_consola(email, nombres, enlace, 'fallo el envio')

    except Exception as error:  # noqa: BLE001 - el envio nunca debe tumbar la peticion
        logger.error('No se pudo enviar el correo de recuperación: %s', error)
        _registrar_en_consola(email, nombres, enlace, 'fallo el envio')

    return enlace
