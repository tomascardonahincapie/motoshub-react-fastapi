"""Modelos ORM. Importarlos aqui registra todas las tablas en Base.metadata."""

from app.models.producto import Producto
from app.models.recuperacion import TokenRecuperacion
from app.models.rol import Permiso, Rol, roles_permisos
from app.models.servicio import Servicio
from app.models.usuario import (
    ROL_ADMINISTRADOR,
    ROL_CLIENTE,
    ROL_EMPLEADO,
    Usuario,
)

__all__ = [
    'Permiso', 'Producto', 'ROL_ADMINISTRADOR', 'ROL_CLIENTE', 'ROL_EMPLEADO',
    'Rol', 'Servicio', 'TokenRecuperacion', 'Usuario', 'roles_permisos',
]
