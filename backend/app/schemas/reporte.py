"""Esquemas del reporte diario de ventas."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.venta import VentaRespuesta


class ResumenReporte(BaseModel):
    cantidad: int
    anuladas: int
    unidades: int
    subtotal: Decimal
    descuento: Decimal
    impuestos: Decimal
    total: Decimal
    ticket_promedio: Decimal


class DatosNegocio(BaseModel):
    nombre: str
    nit: str
    direccion: str
    ciudad: str
    telefono: str
    email: str


class RespuestaReporteDiario(BaseModel):
    ok: bool = True
    fecha: date
    generado: datetime
    negocio: DatosNegocio
    ventas: list[VentaRespuesta]
    resumen: ResumenReporte
