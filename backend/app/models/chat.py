"""Modelos ORM del chatbot: conversaciones y mensajes.

Guardar la conversacion sirve para dos cosas: darle memoria al chatbot dentro
de una misma charla, porque se le reenvian los mensajes anteriores al modelo
de IA, y dejar evidencia de lo que se le respondio a cada cliente.

Las charlas de visitantes que no han iniciado sesion tambien se guardan, con
usuario_id en NULL.
"""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_datos import Base

RolMensajeSQL = Enum('usuario', 'asistente', 'sistema', name='rol_mensaje_enum')


class Conversacion(Base):
    __tablename__ = 'conversaciones'

    id_conversacion: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey('usuarios.id_usuario', ondelete='SET NULL'), nullable=True, index=True,
    )
    titulo: Mapped[str] = mapped_column(String(120), nullable=False, default='Conversacion')
    canal: Mapped[str] = mapped_column(String(30), nullable=False, default='web')

    fecha_inicio: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    mensajes: Mapped[list['Mensaje']] = relationship(
        back_populates='conversacion',
        cascade='all, delete-orphan',
        lazy='selectin',
        order_by='Mensaje.id_mensaje',
    )


class Mensaje(Base):
    __tablename__ = 'mensajes'

    id_mensaje: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversacion_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey('conversaciones.id_conversacion', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    rol: Mapped[str] = mapped_column(RolMensajeSQL, nullable=False)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    # Modelo de IA que genero la respuesta, o 'reglas' cuando no hay API Key.
    origen: Mapped[str | None] = mapped_column(String(60), nullable=True)
    fecha_envio: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    conversacion: Mapped[Conversacion] = relationship(back_populates='mensajes')
