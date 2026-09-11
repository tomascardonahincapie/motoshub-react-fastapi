"""Dependencias reutilizables: sesion de base de datos, JWT y control de roles.

FastAPI ejecuta estas funciones antes del endpoint. Si alguna lanza una
excepcion, el endpoint nunca llega a ejecutarse: asi se protegen las rutas.
"""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.base_datos import obtener_sesion
from app.core.seguridad import decodificar_token
from app.crud import usuarios as crud_usuarios
from app.errores import CuentaInactiva, NoAutenticado, SinPermisos, TokenInvalido
from app.models import Usuario

# Mensajes que el Frontend reconoce para cerrar la sesion automaticamente.
MENSAJE_SIN_TOKEN = 'Acceso denegado: token no proporcionado'
MENSAJE_TOKEN_INVALIDO = 'Token inválido o expirado'

Sesion = Annotated[Session, Depends(obtener_sesion)]

# Lee la cabecera "Authorization: Bearer <token>". Con auto_error=False somos
# nosotros quienes decidimos el mensaje y el codigo de estado.
esquema_bearer = HTTPBearer(
    auto_error=False,
    description='Token JWT obtenido en POST /api/auth/login.',
)

Credenciales = Annotated[HTTPAuthorizationCredentials | None, Depends(esquema_bearer)]


def usuario_actual(credenciales: Credenciales, sesion: Sesion) -> Usuario:
    """Verifica el token y devuelve el usuario autenticado.

    Comprueba existencia del token, firma, expiracion, usuario asociado y que
    la cuenta siga activa.
    """
    if credenciales is None or not credenciales.credentials:
        raise NoAutenticado(MENSAJE_SIN_TOKEN)

    contenido = decodificar_token(credenciales.credentials)
    if contenido is None:
        raise TokenInvalido(MENSAJE_TOKEN_INVALIDO)

    id_usuario = contenido.get('id_usuario')
    if id_usuario is None:
        raise TokenInvalido(MENSAJE_TOKEN_INVALIDO)

    usuario = crud_usuarios.obtener(sesion, int(id_usuario))
    if usuario is None:
        raise TokenInvalido(MENSAJE_TOKEN_INVALIDO)

    if usuario.estado == 'inactivo':
        raise CuentaInactiva('Tu cuenta se encuentra inactiva. Contacta al administrador.')

    return usuario


UsuarioAutenticado = Annotated[Usuario, Depends(usuario_actual)]


class ExigirRoles:
    """Dependencia parametrizable que restringe una ruta a ciertos roles."""

    def __init__(self, *roles_permitidos: str):
        self.roles_permitidos = roles_permitidos

    def __call__(self, usuario: UsuarioAutenticado) -> Usuario:
        if usuario.nombre_rol not in self.roles_permitidos:
            raise SinPermisos('No tienes permisos para acceder a este recurso')
        return usuario


# Atajos usados por los routers.
Administrador = Annotated[Usuario, Depends(ExigirRoles('Administrador'))]
AdministradorOEmpleado = Annotated[Usuario, Depends(ExigirRoles('Administrador', 'Empleado'))]


def es_administrador(usuario: Usuario) -> bool:
    return usuario.nombre_rol == 'Administrador'


def exigir_admin_o_propietario(usuario: Usuario, id_objetivo: int, accion: str) -> None:
    """Permite la operacion al administrador o al propio dueno de la cuenta."""
    if not es_administrador(usuario) and usuario.id_usuario != id_objetivo:
        raise SinPermisos(f'No tienes permiso para {accion} este usuario')
