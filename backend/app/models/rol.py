"""Modelos de roles y permisos (control de acceso)."""

from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_datos import Base

# Relacion N a N entre roles y permisos.
roles_permisos = Table(
    'roles_permisos',
    Base.metadata,
    Column('id_rol', Integer, ForeignKey('roles.id_rol', ondelete='CASCADE'), primary_key=True),
    Column('id_permiso', Integer, ForeignKey('permisos.id_permiso', ondelete='CASCADE'), primary_key=True),
)


class Rol(Base):
    __tablename__ = 'roles'

    id_rol: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre_rol: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)

    permisos: Mapped[list['Permiso']] = relationship(
        secondary=roles_permisos, back_populates='roles', lazy='selectin',
    )
    usuarios: Mapped[list['Usuario']] = relationship(back_populates='rol')  # noqa: F821


class Permiso(Base):
    __tablename__ = 'permisos'

    id_permiso: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre_permiso: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(150), nullable=True)

    roles: Mapped[list[Rol]] = relationship(secondary=roles_permisos, back_populates='permisos')
