"""Operaciones CRUD sobre la tabla servicios."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Servicio


def listar(sesion: Session) -> list[Servicio]:
    consulta = select(Servicio).order_by(Servicio.id_servicio.desc())
    return list(sesion.scalars(consulta))


def obtener(sesion: Session, id_servicio: int) -> Servicio | None:
    return sesion.get(Servicio, id_servicio)


def crear(sesion: Session, datos: dict) -> Servicio:
    servicio = Servicio(**datos)
    sesion.add(servicio)
    sesion.commit()
    sesion.refresh(servicio)
    return servicio


def actualizar(sesion: Session, servicio: Servicio, datos: dict) -> Servicio:
    for campo, valor in datos.items():
        setattr(servicio, campo, valor)
    sesion.commit()
    sesion.refresh(servicio)
    return servicio


def eliminar(sesion: Session, servicio: Servicio) -> None:
    sesion.delete(servicio)
    sesion.commit()
