"""Esquemas Pydantic del modulo de PQR."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.comunes import sin_espacios_sobrantes

TipoPqr = Literal['peticion', 'queja', 'reclamo', 'sugerencia']
EstadoPqr = Literal['pendiente', 'en_proceso', 'respondida', 'cerrada']


class PqrCrear(BaseModel):
    """POST /api/pqr: el cliente radica su solicitud."""

    tipo: TipoPqr
    asunto: str = Field(min_length=5, max_length=120)
    descripcion: str = Field(min_length=15, max_length=2000)
    # Permite al administrador radicar una PQR a nombre de un cliente.
    cliente_id: int | None = Field(default=None, ge=1)

    @field_validator('asunto')
    @classmethod
    def limpiar_asunto(cls, valor: str) -> str:
        return sin_espacios_sobrantes(valor)

    @field_validator('descripcion')
    @classmethod
    def limpiar_descripcion(cls, valor: str) -> str:
        return valor.strip()

    model_config = ConfigDict(json_schema_extra={'examples': [{
        'tipo': 'reclamo',
        'asunto': 'El casco llego con un rayon',
        'descripcion': 'Compre un casco la semana pasada y al abrir la caja tenia un rayon en el lateral derecho. Adjunto el numero de la venta V-2026-000004.',
    }]})


class PqrResponder(BaseModel):
    """PATCH /api/pqr/{id}: el equipo responde o cambia el estado."""

    estado: EstadoPqr
    respuesta: str | None = Field(default=None, max_length=2000)

    @field_validator('respuesta')
    @classmethod
    def limpiar(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        limpio = valor.strip()
        return limpio or None


class PqrRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pqr: int
    radicado: str
    cliente_id: int
    cliente_nombre: str
    cliente_email: str
    tipo: str
    asunto: str
    descripcion: str
    estado: str
    respuesta: str | None = None
    atendido_por: int | None = None
    agente_nombre: str | None = None
    fecha_registro: datetime
    fecha_respuesta: datetime | None = None


class ResumenPqr(BaseModel):
    """Conteos por estado, para las tarjetas del panel."""

    total: int
    pendientes: int
    en_proceso: int
    respondidas: int
    cerradas: int


class RespuestaListaPqr(BaseModel):
    ok: bool = True
    pqr: list[PqrRespuesta]
    resumen: ResumenPqr


class RespuestaPqr(BaseModel):
    ok: bool = True
    pqr: PqrRespuesta


class RespuestaPqrCreada(BaseModel):
    ok: bool = True
    message: str
    id_pqr: int
    radicado: str
