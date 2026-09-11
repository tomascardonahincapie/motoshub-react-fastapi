"""Esquemas y utilidades compartidas por el resto de esquemas."""

import re
from typing import Annotated, Literal

from pydantic import BaseModel, Field

# Expresiones regulares equivalentes a las del Frontend (src/utils/validators.js).
# La validacion del Backend es obligatoria aunque React ya haya validado.
PATRON_NOMBRE = r'^[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00e1\u00e9\u00ed\u00f3\u00fa\u00d1\u00f1\s]{2,50}$'
PATRON_DOCUMENTO = r'^[0-9]{6,15}$'
PATRON_TELEFONO = r'^[0-9]{7,10}$'
PATRON_DIRECCION = r'^[A-Za-z0-9\u00c1\u00c9\u00cd\u00d3\u00da\u00e1\u00e9\u00ed\u00f3\u00fa\u00d1\u00f1#\-.,\s]{5,100}$'

Estado = Literal['activo', 'inactivo']
TipoDocumento = Literal['CC', 'TI', 'CE', 'PA']

# Tipos reutilizables con su validacion de longitud y formato incorporada.
Nombre = Annotated[str, Field(min_length=2, max_length=50, pattern=PATRON_NOMBRE)]
Documento = Annotated[str, Field(min_length=6, max_length=15, pattern=PATRON_DOCUMENTO)]
Telefono = Annotated[str, Field(min_length=7, max_length=10, pattern=PATRON_TELEFONO)]
Direccion = Annotated[str, Field(min_length=5, max_length=100, pattern=PATRON_DIRECCION)]


def validar_password(valor: str) -> str:
    """Exige minimo 8 caracteres con mayuscula, minuscula y numero.

    Se implementa en Python y no como `pattern` porque el motor de expresiones
    regulares de Pydantic v2 no soporta anticipaciones del tipo (?=.*[A-Z]).
    """
    if not 8 <= len(valor) <= 20:
        raise ValueError('La contrasena debe tener entre 8 y 20 caracteres')
    if not re.search(r'[a-z]', valor):
        raise ValueError('La contrasena debe incluir al menos una letra minuscula')
    if not re.search(r'[A-Z]', valor):
        raise ValueError('La contrasena debe incluir al menos una letra mayuscula')
    if not re.search(r'[0-9]', valor):
        raise ValueError('La contrasena debe incluir al menos un numero')
    return valor


def texto_o_nulo(valor: str | None) -> str | None:
    """Convierte las cadenas vacias que envia el Frontend en NULL."""
    if valor is None:
        return None
    limpio = valor.strip()
    return limpio or None


def sin_espacios_sobrantes(valor: str) -> str:
    """Colapsa los espacios repetidos y recorta los extremos."""
    return ' '.join(valor.split())


class RespuestaOk(BaseModel):
    """Respuesta simple de confirmacion."""

    ok: bool = True
    message: str


class DetalleDeError(BaseModel):
    """Formato unico de error devuelto por toda la API."""

    ok: bool = False
    message: str = Field(description='Mensaje legible para mostrar en React.')
    codigo: str = Field(description='Identificador tecnico del error.')
    errors: dict[str, str] = Field(
        default_factory=dict,
        description='Errores por campo, para resaltarlos en el formulario.',
    )
