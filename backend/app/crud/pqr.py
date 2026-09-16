"""Operaciones sobre las PQR: peticiones, quejas, reclamos y sugerencias."""

from datetime import date, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.crud.consecutivos import siguiente_numero
from app.crud.ventas import _limites_del_dia
from app.models import ESTADOS_ABIERTOS, Pqr, Usuario

INTENTOS_NUMERACION = 4


def crear(sesion: Session, datos: dict, cliente: Usuario) -> Pqr:
    """Radica la solicitud y le asigna su numero de radicado."""
    ultimo_error: IntegrityError | None = None

    for _ in range(INTENTOS_NUMERACION):
        registro = Pqr(
            radicado=siguiente_numero(sesion, Pqr.radicado, 'PQR'),
            cliente_id=cliente.id_usuario,
            tipo=datos['tipo'],
            asunto=datos['asunto'],
            descripcion=datos['descripcion'],
            estado='pendiente',
        )
        sesion.add(registro)

        try:
            sesion.commit()
        except IntegrityError as error:
            sesion.rollback()
            ultimo_error = error
            continue

        sesion.refresh(registro)
        return registro

    raise ultimo_error


def obtener(sesion: Session, id_pqr: int) -> Pqr | None:
    return sesion.get(Pqr, id_pqr)


def listar(
    sesion: Session,
    *,
    cliente_id: int | None = None,
    tipo: str | None = None,
    estado: str | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    busqueda: str | None = None,
    limite: int = 200,
) -> list[Pqr]:
    consulta = select(Pqr)
    inicio, fin = _limites_del_dia(desde, hasta)

    if cliente_id is not None:
        consulta = consulta.where(Pqr.cliente_id == cliente_id)
    if tipo:
        consulta = consulta.where(Pqr.tipo == tipo)
    if estado:
        consulta = consulta.where(Pqr.estado == estado)
    if inicio is not None:
        consulta = consulta.where(Pqr.fecha_registro >= inicio)
    if fin is not None:
        consulta = consulta.where(Pqr.fecha_registro <= fin)

    if busqueda:
        patron = f'%{busqueda.strip()}%'
        consulta = consulta.where(or_(
            Pqr.radicado.like(patron),
            Pqr.asunto.like(patron),
            Pqr.descripcion.like(patron),
        ))

    # Lo que sigue abierto va primero: es lo que alguien tiene que atender.
    consulta = consulta.order_by(Pqr.fecha_registro.desc(), Pqr.id_pqr.desc())
    return list(sesion.scalars(consulta.limit(limite)).unique())


def responder(sesion: Session, registro: Pqr, datos: dict, agente: Usuario) -> Pqr:
    """Guarda la respuesta del equipo y actualiza el estado de la solicitud."""
    registro.estado = datos['estado']

    if datos.get('respuesta'):
        registro.respuesta = datos['respuesta']
        registro.fecha_respuesta = datetime.now()
        registro.atendido_por = agente.id_usuario
    elif registro.estado == 'en_proceso' and registro.atendido_por is None:
        # Tomar el caso ya deja constancia de quien lo esta atendiendo.
        registro.atendido_por = agente.id_usuario

    sesion.commit()
    sesion.refresh(registro)
    return registro


def resumen(sesion: Session, cliente_id: int | None = None) -> dict:
    """Cuenta las PQR por estado para las tarjetas del panel."""
    consulta = select(Pqr.estado, func.count(Pqr.id_pqr)).group_by(Pqr.estado)
    if cliente_id is not None:
        consulta = consulta.where(Pqr.cliente_id == cliente_id)

    conteo = dict(sesion.execute(consulta).all())

    return {
        'total': sum(conteo.values()),
        'pendientes': conteo.get('pendiente', 0),
        'en_proceso': conteo.get('en_proceso', 0),
        'respondidas': conteo.get('respondida', 0),
        'cerradas': conteo.get('cerrada', 0),
    }


def contar_abiertas(sesion: Session, cliente_id: int | None = None) -> int:
    consulta = select(func.count(Pqr.id_pqr)).where(Pqr.estado.in_(ESTADOS_ABIERTOS))
    if cliente_id is not None:
        consulta = consulta.where(Pqr.cliente_id == cliente_id)
    return sesion.scalar(consulta) or 0
