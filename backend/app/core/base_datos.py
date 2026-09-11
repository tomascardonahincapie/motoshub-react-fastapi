"""Conexion entre FastAPI y la base de datos SQL mediante SQLAlchemy."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.configuracion import configuracion


class Base(DeclarativeBase):
    """Clase base de la que heredan todos los modelos ORM."""


def crear_motor(url: str) -> Engine:
    """Crea el motor de SQLAlchemy ajustando las opciones segun el driver."""
    if url.startswith('sqlite'):
        # Usado por la bateria de pruebas automaticas (base en memoria).
        from sqlalchemy.pool import StaticPool

        return create_engine(
            url,
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
            future=True,
        )
    return create_engine(url, pool_pre_ping=True, pool_recycle=3600, future=True)


motor = crear_motor(configuracion.url_base_datos)
SesionLocal = sessionmaker(bind=motor, autoflush=False, autocommit=False, future=True)


def obtener_sesion() -> Generator[Session, None, None]:
    """Dependencia de FastAPI: entrega una sesion y la cierra al terminar."""
    sesion = SesionLocal()
    try:
        yield sesion
    finally:
        sesion.close()
