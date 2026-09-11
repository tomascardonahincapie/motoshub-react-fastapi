"""Modelo ORM de la tabla usuarios."""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_datos import Base
from app.models.rol import Rol

TipoDocumentoSQL = Enum('CC', 'TI', 'CE', 'PA', name='tipo_documento_enum')
EstadoSQL = Enum('activo', 'inactivo', name='estado_enum')

# Identificadores de rol definidos en database/schema.sql
ROL_ADMINISTRADOR = 1
ROL_EMPLEADO = 2
ROL_CLIENTE = 3


class Usuario(Base):
    __tablename__ = 'usuarios'

    id_usuario: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rol_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('roles.id_rol'), nullable=False, default=ROL_CLIENTE,
    )
    nombres: Mapped[str] = mapped_column(String(50), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(50), nullable=False)
    tipo_documento: Mapped[str] = mapped_column(TipoDocumentoSQL, nullable=False)
    numero_documento: Mapped[str] = mapped_column(String(15), nullable=False, unique=True)
    direccion: Mapped[str] = mapped_column(String(100), nullable=False)
    telefono: Mapped[str] = mapped_column(String(10), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    # Aqui se guarda UNICAMENTE el hash bcrypt, nunca la contrasena original.
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    foto: Mapped[str | None] = mapped_column(String(255), nullable=True)
    estado: Mapped[str] = mapped_column(EstadoSQL, nullable=False, default='activo', server_default='activo')
    ultimo_acceso: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    rol: Mapped[Rol] = relationship(back_populates='usuarios', lazy='joined')

    @property
    def nombre_rol(self) -> str:
        """Nombre legible del rol (Administrador / Empleado / Cliente)."""
        return self.rol.nombre_rol if self.rol else ''
