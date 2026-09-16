"""Esquemas Pydantic del modulo de facturacion."""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.venta import DetalleVentaRespuesta

EstadoFactura = Literal['emitida', 'pagada', 'anulada']


class FacturaCrear(BaseModel):
    """POST /api/facturas: emite la factura de una venta ya registrada."""

    venta_id: int = Field(ge=1)
    observaciones: str | None = Field(default=None, max_length=255)

    model_config = ConfigDict(json_schema_extra={'examples': [
        {'venta_id': 1, 'observaciones': 'Pago recibido en tienda'},
    ]})


class FacturaEstadoActualizar(BaseModel):
    """PATCH /api/facturas/{id}/estado."""

    estado: EstadoFactura


class FacturaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_factura: int
    numero_factura: str
    venta_id: int
    numero_venta: str | None = None
    cliente_id: int
    cliente_nombre: str
    cliente_documento: str
    cliente_email: str
    cliente_telefono: str | None = None
    cliente_direccion: str | None = None
    subtotal: Decimal
    descuento: Decimal
    impuestos: Decimal
    porcentaje_iva: Decimal
    total: Decimal
    estado: str
    observaciones: str | None = None
    fecha_emision: datetime
    # El detalle viaja aparte porque pertenece a la venta, no a la factura.
    detalles: list[DetalleVentaRespuesta] = []


class RespuestaListaFacturas(BaseModel):
    ok: bool = True
    facturas: list[FacturaRespuesta]
    total_facturado: Decimal


class RespuestaFactura(BaseModel):
    ok: bool = True
    factura: FacturaRespuesta


class RespuestaFacturaCreada(BaseModel):
    ok: bool = True
    message: str
    id_factura: int
    numero_factura: str
