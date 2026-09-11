"""Esquemas del modulo de autenticacion."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field

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
