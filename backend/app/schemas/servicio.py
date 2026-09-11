"""Esquemas Pydantic de servicios."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.comunes import Estado, sin_espacios_sobrantes, texto_o_nulo


class ServicioBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    descripcion: str | None = Field(default=None, max_length=255)
    precio: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    duracion_minutos: int | None = Field(default=None, ge=1, le=1440)
    imagen: str | None = Field(default=None, max_length=255)

    @field_validator('nombre')
    @classmethod
    def limpiar_nombre(cls, valor: str) -> str:
        return sin_espacios_sobrantes(valor)

    @field_validator('descripcion', 'imagen', mode='before')
    @classmethod
    def vacio_es_nulo(cls, valor):
        return texto_o_nulo(valor) if isinstance(valor, str) else valor

    @field_validator('duracion_minutos', mode='before')
    @classmethod
    def duracion_vacia_es_nula(cls, valor):
        return None if valor in ('', None) else valor


class ServicioCrear(ServicioBase):
    """POST /api/servicios."""

    model_config = ConfigDict(json_schema_extra={'examples': [{
        'nombre': 'Sincronizacion de inyeccion',
        'descripcion': 'Ajuste electronico del sistema de inyeccion.',
        'precio': 120000, 'duracion_minutos': 60,
        'imagen': '/img/servicios/diagnostico.jpg',
    }]})


class ServicioActualizar(ServicioBase):
    """PUT /api/servicios/{id}: reemplaza los datos del servicio."""

    estado: Estado = 'activo'


class ServicioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_servicio: int
    nombre: str
    descripcion: str | None = None
    precio: Decimal
    duracion_minutos: int | None = None
    imagen: str | None = None
    estado: str
    fecha_registro: datetime | None = None


class RespuestaListaServicios(BaseModel):
    ok: bool = True
    servicios: list[ServicioRespuesta]


class RespuestaServicio(BaseModel):
    ok: bool = True
    servicio: ServicioRespuesta


class RespuestaServicioCreado(BaseModel):
    ok: bool = True
    message: str
    id_servicio: int
