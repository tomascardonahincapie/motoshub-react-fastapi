"""Modelo ORM de la tabla productos."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base_datos import Base

EstadoSQL = Enum('activo', 'inactivo', name='estado_producto_enum')


class Producto(Base):
    __tablename__ = 'productos'

    id_producto: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    imagen: Mapped[str | None] = mapped_column(String(255), nullable=True)
    categoria: Mapped[str | None] = mapped_column(String(50), nullable=True)
    estado: Mapped[str] = mapped_column(EstadoSQL, nullable=False, default='activo', server_default='activo')
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now(),
    )
