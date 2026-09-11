"""Registro de clientes e inicio de sesion con JWT."""

from fastapi import APIRouter, status

from app.crud import usuarios as crud_usuarios
from app.core.seguridad import crear_token, verificar_password
from app.dependencias import Sesion
from app.errores import ConflictoDeNegocio, CredencialesInvalidas, CuentaInactiva
from app.models import ROL_CLIENTE
from app.schemas.auth import Credenciales, RespuestaLogin, RespuestaRegistro
from app.schemas.comunes import DetalleDeError
from app.schemas.usuario import UsuarioRegistro

router = APIRouter(prefix='/api/auth', tags=['Autenticacion'])

RESPUESTAS_ERROR = {
    409: {'model': DetalleDeError},
    422: {'model': DetalleDeError},
}


def registrar_cliente(sesion: Sesion, datos: UsuarioRegistro) -> dict:
    """Logica de registro compartida por /api/auth/register y /api/usuarios/registro."""
    # 5. Se verifica que el correo o el documento no esten duplicados.
    if crud_usuarios.obtener_por_email(sesion, datos.email):
        raise ConflictoDeNegocio(
            'El correo ya está registrado',
            {'email': 'Este correo ya está registrado'},
        )
    if crud_usuarios.obtener_por_documento(sesion, datos.numero_documento):
        raise ConflictoDeNegocio(
            'Ya existe un usuario registrado con ese número de documento',
            {'numero_documento': 'Este número de documento ya está registrado'},
        )

    # 6 y 7. La contraseña se convierte en hash dentro de crud_usuarios.crear
    # y solo entonces se almacena en la base de datos.
    usuario = crud_usuarios.crear(sesion, datos.model_dump(), rol_id=ROL_CLIENTE)

    return {
        'ok': True,
        'message': 'Usuario registrado correctamente',
        'usuario': {
            'id_usuario': usuario.id_usuario,
            'nombres': usuario.nombres,
            'apellidos': usuario.apellidos,
            'email': usuario.email,
            'rol_id': usuario.rol_id,
        },
    }


@router.post(
    '/register',
    response_model=RespuestaRegistro,
    status_code=status.HTTP_201_CREATED,
    summary='Registrar un cliente',
    description='Valida los datos, comprueba que el correo y el documento no estén '
                'duplicados, genera el hash de la contraseña y guarda el usuario con rol Cliente.',
    responses=RESPUESTAS_ERROR,
)
def register(datos: UsuarioRegistro, sesion: Sesion):
    return registrar_cliente(sesion, datos)


@router.post(
    '/login',
    response_model=RespuestaLogin,
    summary='Iniciar sesión y obtener el JWT',
    description='Verifica las credenciales contra el hash almacenado y devuelve un JSON Web Token.',
    responses={401: {'model': DetalleDeError}, 403: {'model': DetalleDeError}},
)
def login(credenciales: Credenciales, sesion: Sesion):
    usuario = crud_usuarios.obtener_por_email(sesion, credenciales.email)
    if usuario is None:
        raise CredencialesInvalidas('Credenciales inválidas')

    if usuario.estado == 'inactivo':
        raise CuentaInactiva('Tu cuenta se encuentra inactiva. Contacta al administrador.')

    if not verificar_password(credenciales.password, usuario.password):
        raise CredencialesInvalidas('Credenciales inválidas')

    crud_usuarios.registrar_ultimo_acceso(sesion, usuario)

    # El token identifica al usuario y transporta su rol para el control de acceso.
    token = crear_token({
        'id_usuario': usuario.id_usuario,
        'email': usuario.email,
        'rol_id': usuario.rol_id,
        'rol_nombre': usuario.nombre_rol,
    })

    return {
        'ok': True,
        'message': 'Inicio de sesión exitoso',
        'token': token,
        'usuario': usuario,
    }
