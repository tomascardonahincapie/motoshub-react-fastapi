"""Persistencia de las conversaciones del chatbot."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Conversacion, Mensaje, Usuario

# Titulo de la conversacion: el primer mensaje del cliente, recortado.
LARGO_TITULO = 60


def crear_conversacion(sesion: Session, usuario: Usuario | None, primer_mensaje: str) -> Conversacion:
    titulo = primer_mensaje.strip()[:LARGO_TITULO]
    conversacion = Conversacion(
        usuario_id=usuario.id_usuario if usuario else None,
        titulo=titulo or 'Consulta',
    )
    sesion.add(conversacion)
    sesion.commit()
    sesion.refresh(conversacion)
    return conversacion


def obtener_conversacion(sesion: Session, id_conversacion: int) -> Conversacion | None:
    return sesion.get(Conversacion, id_conversacion)


def guardar_mensaje(
    sesion: Session,
    conversacion: Conversacion,
    rol: str,
    contenido: str,
    origen: str | None = None,
) -> Mensaje:
    mensaje = Mensaje(
        conversacion_id=conversacion.id_conversacion,
        rol=rol,
        contenido=contenido,
        origen=origen,
    )
    sesion.add(mensaje)
    sesion.commit()
    sesion.refresh(mensaje)
    return mensaje


def historial_para_ia(conversacion: Conversacion, tope: int = 12) -> list[dict]:
    """Convierte los mensajes guardados al formato que espera el proveedor.

    Los mensajes de sistema no se reenvian: las instrucciones se arman de nuevo
    en cada peticion con el catalogo actualizado.
    """
    equivalencias = {'usuario': 'user', 'asistente': 'assistant'}
    return [
        {'role': equivalencias[m.rol], 'content': m.contenido}
        for m in conversacion.mensajes[-tope:]
        if m.rol in equivalencias
    ]


def listar_conversaciones(sesion: Session, limite: int = 100) -> list[Conversacion]:
    consulta = (
        select(Conversacion)
        .order_by(Conversacion.fecha_actualizacion.desc())
        .limit(limite)
    )
    return list(sesion.scalars(consulta).unique())
