"""Modelos ORM. Importarlos aqui registra todas las tablas en Base.metadata."""

from app.models.chat import Conversacion, Mensaje
from app.models.factura import ESTADOS_FACTURA, DetalleFactura, Factura
from app.models.pqr import ESTADOS_ABIERTOS, ESTADOS_PQR, TIPOS_PQR, Pqr
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
from app.models.venta import ESTADOS_VENTA, METODOS_PAGO, DetalleVenta, Venta

__all__ = [
    'ESTADOS_ABIERTOS', 'ESTADOS_FACTURA', 'ESTADOS_PQR', 'ESTADOS_VENTA',
    'METODOS_PAGO', 'TIPOS_PQR', 'Conversacion', 'DetalleFactura', 'DetalleVenta',
    'Factura',
    'Mensaje', 'Permiso', 'Pqr', 'Producto', 'ROL_ADMINISTRADOR', 'ROL_CLIENTE',
    'ROL_EMPLEADO', 'Rol', 'Servicio', 'TokenRecuperacion', 'Usuario', 'Venta',
    'roles_permisos',
]
