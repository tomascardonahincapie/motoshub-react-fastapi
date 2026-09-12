"""Modelo ORM de la tabla tokens_recuperacion.

Guarda las solicitudes de restablecimiento de contraseña. Por seguridad no se
almacena el token que recibe el usuario, sino su hash SHA-256: si alguien
obtuviera acceso a la tabla, no podría usar los tokens para cambiar claves.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_datos import Base
from app.models.usuario import Usuario


class TokenRecuperacion(Base):
    __tablename__ = 'tokens_recuperacion'

    id_token: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_usuario: Mapped[int] = mapped_column(
        Integer, ForeignKey('usuarios.id_usuario', ondelete='CASCADE'), nullable=False,
    )
    # SHA-256 en hexadecimal: 64 caracteres.
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    fecha_expiracion: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    usado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    usuario: Mapped[Usuario] = relationship(lazy='joined')

    def esta_vigente(self, ahora: datetime) -> bool:
        """Un token sirve una sola vez y solo antes de expirar."""
        return not self.usado and self.fecha_expiracion > ahora
