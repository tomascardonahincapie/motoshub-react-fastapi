"""Excepciones propias del dominio.

Cada una se traduce en main.py a una respuesta JSON con el mismo formato que
usaba el Backend anterior: {"ok": false, "message": "...", "codigo": "..."}.
"""

from fastapi import status


class ErrorDeDominio(Exception):
    """Error de negocio generico -> 400 Bad Request."""

    codigo = 'error_de_dominio'
    estado = status.HTTP_400_BAD_REQUEST

    def __init__(self, mensaje: str, errores: dict[str, str] | None = None):
        self.mensaje = mensaje
        # Errores por campo, para que React pueda pintarlos junto al input.
        self.errores = errores or {}
        super().__init__(mensaje)


class RecursoNoEncontrado(ErrorDeDominio):
    codigo = 'recurso_no_encontrado'
    estado = status.HTTP_404_NOT_FOUND

    def __init__(self, recurso: str):
        super().__init__(f'{recurso} no encontrado')


class ConflictoDeNegocio(ErrorDeDominio):
    codigo = 'conflicto_de_negocio'
    estado = status.HTTP_409_CONFLICT


class NoAutenticado(ErrorDeDominio):
    """Falta el token o no se pudo validar -> 401."""

    codigo = 'no_autenticado'
    estado = status.HTTP_401_UNAUTHORIZED


class TokenInvalido(ErrorDeDominio):
    """El token existe pero la firma o la expiracion no son validas -> 403."""

    codigo = 'token_invalido'
    estado = status.HTTP_403_FORBIDDEN


class SinPermisos(ErrorDeDominio):
    """El usuario esta autenticado pero su rol no le permite la operacion -> 403."""

    codigo = 'sin_permisos'
    estado = status.HTTP_403_FORBIDDEN


class CuentaInactiva(ErrorDeDominio):
    codigo = 'cuenta_inactiva'
    estado = status.HTTP_403_FORBIDDEN


class CredencialesInvalidas(ErrorDeDominio):
    codigo = 'credenciales_invalidas'
    estado = status.HTTP_401_UNAUTHORIZED
