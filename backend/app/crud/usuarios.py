"""Operaciones CRUD sobre la tabla usuarios."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.seguridad import generar_hash
from app.models import ROL_CLIENTE, Usuario


def listar(sesion: Session) -> list[Usuario]:
    """Todos los usuarios, del mas reciente al mas antiguo."""
    consulta = select(Usuario).order_by(Usuario.id_usuario.desc())
    return list(sesion.scalars(consulta).unique())


def obtener(sesion: Session, id_usuario: int) -> Usuario | None:
    return sesion.get(Usuario, id_usuario)


def obtener_por_email(sesion: Session, email: str) -> Usuario | None:
    consulta = select(Usuario).where(Usuario.email == email.strip().lower())
    return sesion.scalars(consulta).unique().first()


def obtener_por_documento(sesion: Session, numero_documento: str) -> Usuario | None:
    consulta = select(Usuario).where(Usuario.numero_documento == numero_documento)
    return sesion.scalars(consulta).unique().first()


def crear(sesion: Session, datos: dict, rol_id: int = ROL_CLIENTE) -> Usuario:
    """Inserta un usuario. La contrasena se guarda siempre hasheada."""
    campos = datos.copy()
    password_plana = campos.pop('password')
    campos.pop('rol_id', None)

    usuario = Usuario(**campos, rol_id=rol_id, password=generar_hash(password_plana))
    sesion.add(usuario)
    sesion.commit()
    sesion.refresh(usuario)
    return usuario


def actualizar(sesion: Session, usuario: Usuario, datos: dict) -> Usuario:
    """Actualiza los datos basicos del usuario."""
    for campo, valor in datos.items():
        setattr(usuario, campo, valor)
    sesion.commit()
    sesion.refresh(usuario)
    return usuario


def cambiar_estado(sesion: Session, usuario: Usuario, estado: str) -> Usuario:
    """Activa o inactiva un usuario conservando su informacion historica."""
    usuario.estado = estado
    sesion.commit()
    sesion.refresh(usuario)
    return usuario


def eliminar(sesion: Session, usuario: Usuario) -> None:
    sesion.delete(usuario)
    sesion.commit()


def registrar_ultimo_acceso(sesion: Session, usuario: Usuario) -> None:
    usuario.ultimo_acceso = datetime.now()
    sesion.commit()
