"""Esquemas Pydantic de productos."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.comunes import Estado, sin_espacios_sobrantes, texto_o_nulo


class ProductoBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    descripcion: str | None = Field(default=None, max_length=255)
    precio: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    stock: int = Field(default=0, ge=0)
    imagen: str | None = Field(default=None, max_length=255)
    categoria: str | None = Field(default=None, max_length=50)

    @field_validator('nombre')
    @classmethod
    def limpiar_nombre(cls, valor: str) -> str:
        return sin_espacios_sobrantes(valor)

    @field_validator('descripcion', 'imagen', 'categoria', mode='before')
    @classmethod
    def vacio_es_nulo(cls, valor):
        return texto_o_nulo(valor) if isinstance(valor, str) else valor


class ProductoCrear(ProductoBase):
    """POST /api/productos."""

    model_config = ConfigDict(json_schema_extra={'examples': [{
        'nombre': 'Yamaha MT-03', 'descripcion': 'Naked de 321cc para ciudad y ruta.',
        'precio': 26900000, 'stock': 3, 'imagen': 'https://ejemplo.com/mt03.webp',
        'categoria': 'Motos',
    }]})


class ProductoActualizar(ProductoBase):
    """PUT /api/productos/{id}: reemplaza los datos del producto."""

    estado: Estado = 'activo'


class ProductoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_producto: int
    nombre: str
    descripcion: str | None = None
    precio: Decimal
    stock: int
    imagen: str | None = None
    categoria: str | None = None
    estado: str
    fecha_registro: datetime | None = None


class RespuestaListaProductos(BaseModel):
    ok: bool = True
    productos: list[ProductoRespuesta]


class RespuestaProducto(BaseModel):
    ok: bool = True
    producto: ProductoRespuesta


class RespuestaProductoCreado(BaseModel):
    ok: bool = True
    message: str
    id_producto: int
