"""Operaciones sobre la tabla tokens_recuperacion."""

from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.configuracion import configuracion
from app.core.seguridad import generar_token_recuperacion, hash_de_token
from app.models import TokenRecuperacion, Usuario


def invalidar_anteriores(sesion: Session, id_usuario: int) -> None:
    """Anula las solicitudes previas del usuario: solo vale la más reciente."""
    sesion.execute(
        update(TokenRecuperacion)
        .where(TokenRecuperacion.id_usuario == id_usuario, TokenRecuperacion.usado.is_(False))
        .values(usado=True),
    )


def crear(sesion: Session, usuario: Usuario) -> tuple[str, TokenRecuperacion]:
    """Genera un token nuevo para el usuario.

    Devuelve el token en claro (que solo viaja hasta el usuario) y el registro
    guardado, que únicamente contiene su hash.
    """
    invalidar_anteriores(sesion, usuario.id_usuario)

    token = generar_token_recuperacion()
    registro = TokenRecuperacion(
        id_usuario=usuario.id_usuario,
        token_hash=hash_de_token(token),
        fecha_expiracion=datetime.now() + timedelta(minutes=configuracion.recuperacion_expira_minutos),
        usado=False,
    )
    sesion.add(registro)
    sesion.commit()
    sesion.refresh(registro)
    return token, registro


def solicitud_reciente(sesion: Session, id_usuario: int, minutos: int) -> TokenRecuperacion | None:
    """Devuelve la ultima solicitud del usuario si todavia esta vigente.

    Sirve para no mandar un correo nuevo cada vez que alguien pulsa el boton:
    mientras el enlace anterior siga sirviendo, se reutiliza en silencio. Sin
    esto, un formulario que se reenvie solo llena el buzon del usuario.
    """
    limite = datetime.now() - timedelta(minutes=minutos)
    consulta = (
        select(TokenRecuperacion)
        .where(
            TokenRecuperacion.id_usuario == id_usuario,
            TokenRecuperacion.usado.is_(False),
            TokenRecuperacion.fecha_expiracion > datetime.now(),
            TokenRecuperacion.fecha_creacion > limite,
        )
        .order_by(TokenRecuperacion.id_token.desc())
    )
    return sesion.scalars(consulta).unique().first()


def obtener_por_token(sesion: Session, token: str) -> TokenRecuperacion | None:
    """Busca la solicitud a partir del token en claro."""
    consulta = select(TokenRecuperacion).where(TokenRecuperacion.token_hash == hash_de_token(token))
    return sesion.scalars(consulta).unique().first()


def marcar_usado(sesion: Session, registro: TokenRecuperacion) -> None:
    registro.usado = True
    sesion.commit()


def limpiar_expirados(sesion: Session) -> int:
    """Elimina los tokens vencidos. Devuelve cuántos se borraron."""
    consulta = select(TokenRecuperacion).where(TokenRecuperacion.fecha_expiracion < datetime.now())
    vencidos = list(sesion.scalars(consulta).unique())
    for registro in vencidos:
        sesion.delete(registro)
    sesion.commit()
    return len(vencidos)
