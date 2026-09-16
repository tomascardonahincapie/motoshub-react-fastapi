"""Esquemas Pydantic del modulo de ventas.

Una regla importante: el Frontend nunca envia precios. Solo dice que articulo
quiere y cuantas unidades; el precio se toma siempre del catalogo en la base
de datos. De lo contrario cualquiera podria comprar una moto por mil pesos
modificando la peticion.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.comunes import texto_o_nulo

TipoItem = Literal['producto', 'servicio']
EstadoVenta = Literal['pendiente', 'pagada', 'anulada']
MetodoPago = Literal['efectivo', 'tarjeta', 'transferencia', 'credito']


class ItemVentaCrear(BaseModel):
    """Una linea del carrito: que se compra y cuantas unidades."""

    tipo_item: TipoItem
    id_item: int = Field(ge=1, description='id_producto o id_servicio segun el tipo.')
    cantidad: int = Field(default=1, ge=1, le=999)
    descuento: Decimal = Field(default=Decimal('0'), ge=0, max_digits=12, decimal_places=2)


class VentaCrear(BaseModel):
    """POST /api/ventas."""

    # Lo usan el administrador y el empleado para vender a nombre de un cliente.
    # Cuando compra el propio cliente se ignora y se toma del token.
    cliente_id: int | None = Field(default=None, ge=1)
    metodo_pago: MetodoPago = 'efectivo'
    observaciones: str | None = Field(default=None, max_length=255)
    items: list[ItemVentaCrear] = Field(min_length=1, max_length=50)
    # Emitir la factura en el mismo momento del registro.
    generar_factura: bool = True

    @field_validator('observaciones', mode='before')
    @classmethod
    def vacio_es_nulo(cls, valor):
        return texto_o_nulo(valor) if isinstance(valor, str) else valor

    model_config = ConfigDict(json_schema_extra={'examples': [{
        'metodo_pago': 'transferencia',
        'observaciones': 'Entrega en tienda',
        'generar_factura': True,
        'items': [
            {'tipo_item': 'producto', 'id_item': 1, 'cantidad': 1, 'descuento': 0},
            {'tipo_item': 'servicio', 'id_item': 2, 'cantidad': 1, 'descuento': 0},
        ],
    }]})


class VentaEstadoActualizar(BaseModel):
    """PATCH /api/ventas/{id}/estado."""

    estado: EstadoVenta


class DetalleVentaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_detalle: int
    tipo_item: str
    producto_id: int | None = None
    servicio_id: int | None = None
    nombre_item: str
    cantidad: int
    precio_unitario: Decimal
    descuento: Decimal
    subtotal: Decimal


class VentaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_venta: int
    numero_venta: str
    cliente_id: int
    cliente_nombre: str
    usuario_id: int | None = None
    vendedor_nombre: str | None = None
    subtotal: Decimal
    descuento: Decimal
    impuestos: Decimal
    total: Decimal
    estado: str
    metodo_pago: str
    observaciones: str | None = None
    cantidad_items: int
    numero_factura: str | None = None
    id_factura: int | None = None
    fecha_venta: datetime
    detalles: list[DetalleVentaRespuesta] = []


class ResumenVentas(BaseModel):
    """Totales del conjunto de ventas que devolvio el filtro aplicado."""

    cantidad: int
    total: Decimal
    subtotal: Decimal
    impuestos: Decimal
    descuento: Decimal
    ticket_promedio: Decimal


class RespuestaListaVentas(BaseModel):
    ok: bool = True
    ventas: list[VentaRespuesta]
    resumen: ResumenVentas


class RespuestaVenta(BaseModel):
    ok: bool = True
    venta: VentaRespuesta


class RespuestaVentaCreada(BaseModel):
    ok: bool = True
    message: str
    id_venta: int
    numero_venta: str
    total: Decimal
    id_factura: int | None = None
    numero_factura: str | None = None
