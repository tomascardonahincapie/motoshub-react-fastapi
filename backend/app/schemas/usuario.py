"""Esquemas Pydantic de usuarios: validan lo que entra y definen lo que sale."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.comunes import (
    Direccion,
    Documento,
    Estado,
    Nombre,
    Telefono,
    TipoDocumento,
    sin_espacios_sobrantes,
    validar_password,
)


class UsuarioBase(BaseModel):
    """Campos comunes del formulario de registro."""

    nombres: Nombre
    apellidos: Nombre
    direccion: Direccion
    telefono: Telefono
    email: EmailStr = Field(max_length=100)

    @field_validator('nombres', 'apellidos', 'direccion')
    @classmethod
    def limpiar_espacios(cls, valor: str) -> str:
        return sin_espacios_sobrantes(valor)

    @field_validator('email')
    @classmethod
    def email_en_minusculas(cls, valor: str) -> str:
        return valor.strip().lower()


class UsuarioRegistro(UsuarioBase):
    """POST /api/auth/register y POST /api/usuarios/registro (publico)."""

    tipo_documento: TipoDocumento
    numero_documento: Documento
    password: str = Field(min_length=8, max_length=20)

    model_config = ConfigDict(json_schema_extra={'examples': [{
        'nombres': 'Tomas', 'apellidos': 'Cardona', 'tipo_documento': 'CC',
        'numero_documento': '1035123456', 'direccion': 'Calle 10 #45-20',
        'telefono': '3001234567', 'email': 'tomas@correo.com', 'password': 'Clave123',
    }]})

    @field_validator('password')
    @classmethod
    def password_segura(cls, valor: str) -> str:
        return validar_password(valor)


class UsuarioCrear(UsuarioRegistro):
    """POST /api/usuarios: el administrador puede elegir el rol."""

    rol_id: int = Field(ge=1, le=3, description='1 Administrador, 2 Empleado, 3 Cliente')


class UsuarioActualizar(BaseModel):
    """PUT /api/usuarios/{id}. El rol solo lo aplica el administrador."""

    nombres: Nombre
    apellidos: Nombre
    direccion: Direccion
    telefono: Telefono
    email: EmailStr = Field(max_length=100)
    rol_id: int | None = Field(default=None, ge=1, le=3)

    @field_validator('nombres', 'apellidos', 'direccion')
    @classmethod
    def limpiar_espacios(cls, valor: str) -> str:
        return sin_espacios_sobrantes(valor)

    @field_validator('email')
    @classmethod
    def email_en_minusculas(cls, valor: str) -> str:
        return valor.strip().lower()


class CambioDeEstado(BaseModel):
    """PATCH /api/usuarios/{id}/estado."""

    estado: Estado

    model_config = ConfigDict(json_schema_extra={'examples': [{'estado': 'inactivo'}]})


class UsuarioRespuesta(BaseModel):
    """Datos del usuario que salen de la API. Nunca incluye la contrasena."""

    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    rol_id: int
    nombre_rol: str
    nombres: str
    apellidos: str
    tipo_documento: str
    numero_documento: str
    direccion: str
    telefono: str
    email: str
    estado: str
    ultimo_acceso: datetime | None = None
    fecha_registro: datetime | None = None


class RespuestaListaUsuarios(BaseModel):
    ok: bool = True
    usuarios: list[UsuarioRespuesta]


class RespuestaUsuario(BaseModel):
    ok: bool = True
    usuario: UsuarioRespuesta


class RespuestaUsuarioCreado(BaseModel):
    ok: bool = True
    message: str
    id_usuario: int
