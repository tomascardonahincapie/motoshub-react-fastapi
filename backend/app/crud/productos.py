"""Operaciones CRUD sobre la tabla productos."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Producto


def listar(sesion: Session) -> list[Producto]:
    consulta = select(Producto).order_by(Producto.id_producto.desc())
    return list(sesion.scalars(consulta))


def obtener(sesion: Session, id_producto: int) -> Producto | None:
    return sesion.get(Producto, id_producto)


def crear(sesion: Session, datos: dict) -> Producto:
    producto = Producto(**datos)
    sesion.add(producto)
    sesion.commit()
    sesion.refresh(producto)
    return producto


def actualizar(sesion: Session, producto: Producto, datos: dict) -> Producto:
    for campo, valor in datos.items():
        setattr(producto, campo, valor)
    sesion.commit()
    sesion.refresh(producto)
    return producto


def eliminar(sesion: Session, producto: Producto) -> None:
    sesion.delete(producto)
    sesion.commit()
