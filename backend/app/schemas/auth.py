"""Esquemas del modulo de autenticacion."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.comunes import validar_password
from app.schemas.usuario import UsuarioRespuesta


class Credenciales(BaseModel):
    """POST /api/auth/login.

    Aqui no se aplica el patron de contrasena fuerte: solo se comprueba que
    venga un valor. Quien decide si es correcta es la verificacion del hash.
    """

    email: EmailStr = Field(max_length=100)
    password: str = Field(min_length=1, max_length=100)

    model_config = ConfigDict(json_schema_extra={'examples': [
        {'email': 'admin@jhmtech.com', 'password': 'Admin1234'},
    ]})


class RespuestaLogin(BaseModel):
    ok: bool = True
    message: str
    token: str = Field(description='JWT que React debe enviar como "Authorization: Bearer <token>".')
    usuario: UsuarioRespuesta


class UsuarioRegistrado(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    email: str
    rol_id: int


class RespuestaRegistro(BaseModel):
    ok: bool = True
    message: str
    usuario: UsuarioRegistrado


# ---------------------------------------------------------------------------
# Recuperacion de contrasena
# ---------------------------------------------------------------------------
class SolicitudRecuperacion(BaseModel):
    """POST /api/auth/recuperar-password."""

    email: EmailStr = Field(max_length=100, description='Correo de la cuenta a recuperar.')

    model_config = ConfigDict(json_schema_extra={'examples': [
        {'email': 'cliente@jhmtech.com'},
    ]})


class RespuestaRecuperacion(BaseModel):
    ok: bool = True
    message: str
    # Solo se completa cuando DEPURACION=true, para poder probar sin correo.
    enlace: str | None = Field(
        default=None,
        description='Enlace de restablecimiento. Solo se devuelve en modo desarrollo.',
    )


class RestablecerPassword(BaseModel):
    """POST /api/auth/restablecer-password."""

    token: str = Field(min_length=20, max_length=100)
    # Sin min_length aqui: validar_password ya comprueba la longitud y
    # devuelve el mensaje en espanol, igual que en el formulario de registro.
    password: str

    model_config = ConfigDict(json_schema_extra={'examples': [
        {'token': 'PEGAR_AQUI_EL_TOKEN_DEL_ENLACE', 'password': 'NuevaClave123'},
    ]})

    @field_validator('password')
    @classmethod
    def password_segura(cls, valor: str) -> str:
        return validar_password(valor)


class TokenVerificado(BaseModel):
    ok: bool = True
    email: str = Field(description='Correo enmascarado del dueno del enlace.')
    nombres: str
    minutos_restantes: int
