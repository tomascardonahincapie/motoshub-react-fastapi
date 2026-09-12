"""Registro de clientes e inicio de sesion con JWT."""

from datetime import datetime

from fastapi import APIRouter, Path as RutaPath, status

from app.core.configuracion import configuracion
from app.core.notificaciones import enviar_enlace_recuperacion
from app.core.seguridad import crear_token, generar_hash, verificar_password
from app.crud import recuperacion as crud_recuperacion
from app.crud import usuarios as crud_usuarios
from app.dependencias import Sesion
from app.errores import (
    ConflictoDeNegocio,
    CredencialesInvalidas,
    CuentaInactiva,
    TokenRecuperacionInvalido,
)
from app.models import ROL_CLIENTE
from app.schemas.auth import (
    Credenciales,
    RespuestaLogin,
    RespuestaRecuperacion,
    RespuestaRegistro,
    RestablecerPassword,
    SolicitudRecuperacion,
    TokenVerificado,
)
from app.schemas.comunes import DetalleDeError, RespuestaOk
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


# ===========================================================================
# Recuperacion de contrasena
# ===========================================================================
def enmascarar(email: str) -> str:
    """cliente@jhmtech.com -> c*****e@jhmtech.com (para confirmar sin exponer)."""
    usuario, _, dominio = email.partition('@')
    if len(usuario) <= 2:
        oculto = usuario[0] + '*'
    else:
        oculto = f'{usuario[0]}{"*" * (len(usuario) - 2)}{usuario[-1]}'
    return f'{oculto}@{dominio}'


@router.post(
    '/recuperar-password',
    response_model=RespuestaRecuperacion,
    summary='Solicitar la recuperación de la contraseña',
    description='Genera un enlace de un solo uso con vigencia limitada y lo envía al correo '
                'de la cuenta. Responde siempre lo mismo exista o no el correo, para no '
                'revelar qué direcciones están registradas.',
)
def recuperar_password(datos: SolicitudRecuperacion, sesion: Sesion):
    usuario = crud_usuarios.obtener_por_email(sesion, datos.email)

    respuesta = {
        'ok': True,
        'message': 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
        'enlace': None,
    }

    # Ni una cuenta inexistente ni una inactiva reciben enlace, pero el mensaje
    # de salida es identico para no filtrar cuales existen.
    if usuario is None or usuario.estado == 'inactivo':
        return respuesta

    token, _ = crud_recuperacion.crear(sesion, usuario)
    enlace = enviar_enlace_recuperacion(usuario.email, usuario.nombres, token)

    # En desarrollo se devuelve el enlace para poder probar el flujo sin correo.
    if configuracion.depuracion:
        respuesta['enlace'] = enlace

    return respuesta


@router.get(
    '/restablecer-password/{token}',
    response_model=TokenVerificado,
    summary='Comprobar si un enlace de recuperación sigue siendo válido',
    description='React lo consulta antes de mostrar el formulario, para avisar de inmediato '
                'si el enlace ya se usó o expiró.',
    responses={400: {'model': DetalleDeError}},
)
def verificar_token(sesion: Sesion, token: str = RutaPath(min_length=20, max_length=100)):
    registro = crud_recuperacion.obtener_por_token(sesion, token)
    ahora = datetime.now()

    if registro is None or not registro.esta_vigente(ahora):
        raise TokenRecuperacionInvalido()

    restantes = max(int((registro.fecha_expiracion - ahora).total_seconds() // 60), 0)
    return {
        'ok': True,
        'email': enmascarar(registro.usuario.email),
        'nombres': registro.usuario.nombres,
        'minutos_restantes': restantes,
    }


@router.post(
    '/restablecer-password',
    response_model=RespuestaOk,
    summary='Definir la nueva contraseña',
    description='Valida el token, guarda la nueva contraseña como hash bcrypt y marca el '
                'enlace como usado para que no sirva una segunda vez.',
    responses={400: {'model': DetalleDeError}, 422: {'model': DetalleDeError}},
)
def restablecer_password(datos: RestablecerPassword, sesion: Sesion):
    registro = crud_recuperacion.obtener_por_token(sesion, datos.token)

    if registro is None or not registro.esta_vigente(datetime.now()):
        raise TokenRecuperacionInvalido()

    usuario = registro.usuario
    if usuario.estado == 'inactivo':
        raise CuentaInactiva('Tu cuenta se encuentra inactiva. Contacta al administrador.')

    # Nunca se guarda la contraseña en claro: solo su hash bcrypt.
    usuario.password = generar_hash(datos.password)
    crud_recuperacion.marcar_usado(sesion, registro)

    return {'ok': True, 'message': 'Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.'}
