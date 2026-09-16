"""Esquemas Pydantic de los indicadores y graficos de los Dashboards.

Todo lo que pintan los Dashboards en React sale de aqui: ni un solo numero
esta escrito a mano en el Frontend.

Los campos marcados como opcionales solo los rellena el Backend cuando el rol
del usuario tiene permiso para verlos. Un cliente que consulte estos mismos
endpoints recibe unicamente sus propias cifras y el resto llega en null.
"""

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

Agrupacion = Literal['dia', 'semana', 'mes']


class Indicadores(BaseModel):
    """Cifras que alimentan las tarjetas (Cards) del Dashboard."""

    # --- Visibles para todos los roles, referidos a lo que a cada uno le toca
    ventas_cantidad: int = 0
    ventas_total: Decimal = Decimal('0')
    ticket_promedio: Decimal = Decimal('0')
    facturas_cantidad: int = 0
    facturas_total: Decimal = Decimal('0')
    pqr_total: int = 0
    pqr_pendientes: int = 0

    # --- Solo Administrador y Empleado
    ventas_hoy_cantidad: int | None = None
    ventas_hoy_total: Decimal | None = None
    ventas_mes_total: Decimal | None = None
    productos: int | None = None
    servicios: int | None = None
    valor_inventario: Decimal | None = None
    productos_sin_stock: int | None = None

    # --- Solo Administrador
    usuarios: int | None = None
    usuarios_activos: int | None = None
    clientes: int | None = None


class PuntoSerie(BaseModel):
    """Un punto del grafico de barras o de lineas."""

    periodo: str = Field(description='Clave del periodo: 2026-09-16, 2026-S38 o 2026-09.')
    etiqueta: str = Field(description='Texto corto para el eje X: "16 sep".')
    total: Decimal = Decimal('0')
    cantidad: int = 0


class ItemRanking(BaseModel):
    """Una fila del ranking de lo mas vendido."""

    nombre: str
    tipo: str
    cantidad: int
    total: Decimal


class ConteoPorClave(BaseModel):
    """Reparto por estado, metodo de pago o tipo de PQR."""

    clave: str
    etiqueta: str
    cantidad: int
    total: Decimal = Decimal('0')


class RespuestaResumen(BaseModel):
    ok: bool = True
    rol: str
    indicadores: Indicadores


class RespuestaDashboardVentas(BaseModel):
    ok: bool = True
    rol: str
    agrupacion: Agrupacion
    desde: date
    hasta: date
    indicadores: Indicadores
    # Grafico de barras y grafico lineal comparten esta serie temporal.
    serie: list[PuntoSerie]
    ranking: list[ItemRanking]
    por_estado: list[ConteoPorClave]
    por_metodo_pago: list[ConteoPorClave]
