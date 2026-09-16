"""Modelo ORM de las PQR: peticiones, quejas, reclamos y sugerencias.

El cliente radica la solicitud y consulta su estado; el administrador o el
empleado la atiende y responde. Cada PQR recibe un numero de radicado, que es
el que se le entrega al cliente para hacer seguimiento.
"""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_datos import Base

TipoPqrSQL = Enum('peticion', 'queja', 'reclamo', 'sugerencia', name='tipo_pqr_enum')
EstadoPqrSQL = Enum('pendiente', 'en_proceso', 'respondida', 'cerrada', name='estado_pqr_enum')

TIPOS_PQR = ('peticion', 'queja', 'reclamo', 'sugerencia')
ESTADOS_PQR = ('pendiente', 'en_proceso', 'respondida', 'cerrada')
# Estados que siguen ocupando a alguien del equipo.
ESTADOS_ABIERTOS = ('pendiente', 'en_proceso')


class Pqr(Base):
    __tablename__ = 'pqr'

    id_pqr: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Radicado que se entrega al cliente: PQR-2026-000001
    radicado: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)

    cliente_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('usuarios.id_usuario', ondelete='CASCADE'), nullable=False, index=True,
    )
    tipo: Mapped[str] = mapped_column(TipoPqrSQL, nullable=False, index=True)
    asunto: Mapped[str] = mapped_column(String(120), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)

    estado: Mapped[str] = mapped_column(
        EstadoPqrSQL, nullable=False, default='pendiente', server_default='pendiente', index=True,
    )
    respuesta: Mapped[str | None] = mapped_column(Text, nullable=True)
    atendido_por: Mapped[int | None] = mapped_column(
        Integer, ForeignKey('usuarios.id_usuario', ondelete='SET NULL'), nullable=True,
    )

    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True,
    )
    fecha_respuesta: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    cliente: Mapped['Usuario'] = relationship(foreign_keys=[cliente_id], lazy='joined')  # noqa: F821
    agente: Mapped['Usuario | None'] = relationship(foreign_keys=[atendido_por], lazy='joined')  # noqa: F821

    @property
    def cliente_nombre(self) -> str:
        if not self.cliente:
            return ''
        return f'{self.cliente.nombres} {self.cliente.apellidos}'.strip()

    @property
    def cliente_email(self) -> str:
        return self.cliente.email if self.cliente else ''

    @property
    def agente_nombre(self) -> str | None:
        if not self.agente:
            return None
        return f'{self.agente.nombres} {self.agente.apellidos}'.strip()
