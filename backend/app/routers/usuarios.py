"""CRUD de usuarios. Todas las rutas -salvo el registro- exigen JWT."""

from typing import Annotated

from fastapi import APIRouter, Path, status

from app.crud import usuarios as crud_usuarios
from app.dependencias import (
    Administrador,
    Sesion,
    UsuarioAutenticado,
    es_administrador,
    exigir_admin_o_propietario,
)
from app.errores import ConflictoDeNegocio, RecursoNoEncontrado
from app.routers.auth import registrar_cliente
from app.schemas.auth import RespuestaRegistro
from app.schemas.comunes import DetalleDeError, RespuestaOk
from app.schemas.usuario import (
    CambioDeEstado,
    RespuestaListaUsuarios,
    RespuestaUsuario,
    RespuestaUsuarioCreado,
    UsuarioActualizar,
    UsuarioCrear,
    UsuarioRegistro,
)

router = APIRouter(
    prefix='/api/usuarios',
    tags=['Usuarios'],
    responses={
        401: {'model': DetalleDeError, 'description': 'Falta el token'},
        403: {'model': DetalleDeError, 'description': 'Token inválido o rol sin permisos'},
        404: {'model': DetalleDeError},
    },
)

IdUsuario = Annotated[int, Path(ge=1, description='Identificador del usuario.')]


def buscar_o_fallar(sesion: Sesion, id_usuario: int):
    usuario = crud_usuarios.obtener(sesion, id_usuario)
    if usuario is None:
        raise RecursoNoEncontrado('Usuario')
    return usuario


# IMPORTANTE: esta ruta se declara antes que /{id_usuario} para que FastAPI no
# intente interpretar la palabra "registro" como un identificador numérico.
@router.post(
    '/registro',
    response_model=RespuestaRegistro,
    status_code=status.HTTP_201_CREATED,
    summary='Registrar un cliente (ruta pública)',
    description='Equivalente a POST /api/auth/register. Se expone también aquí '
                'porque es la ruta indicada en la guía del cuarto avance.',
    responses={409: {'model': DetalleDeError}, 422: {'model': DetalleDeError}},
)
def registro_publico(datos: UsuarioRegistro, sesion: Sesion):
    return registrar_cliente(sesion, datos)


@router.get(
    '',
    response_model=RespuestaListaUsuarios,
    summary='Listar todos los usuarios',
    description='Solo el Administrador puede consultar el listado completo.',
)
def listar_usuarios(sesion: Sesion, administrador: Administrador):
    return {'ok': True, 'usuarios': crud_usuarios.listar(sesion)}


@router.get(
    '/{id_usuario}',
    response_model=RespuestaUsuario,
    summary='Consultar un usuario',
    description='Accesible para el Administrador o para el propio usuario.',
)
def obtener_usuario(id_usuario: IdUsuario, sesion: Sesion, usuario_actual: UsuarioAutenticado):
    exigir_admin_o_propietario(usuario_actual, id_usuario, 'ver')
    return {'ok': True, 'usuario': buscar_o_fallar(sesion, id_usuario)}


@router.post(
    '',
    response_model=RespuestaUsuarioCreado,
    status_code=status.HTTP_201_CREATED,
    summary='Crear un usuario con cualquier rol',
    description='Solo el Administrador. Sirve para dar de alta empleados u otros administradores.',
    responses={409: {'model': DetalleDeError}},
)
def crear_usuario(datos: UsuarioCrear, sesion: Sesion, administrador: Administrador):
    if crud_usuarios.obtener_por_email(sesion, datos.email):
        raise ConflictoDeNegocio(
            'Ya existe un usuario con ese correo',
            {'email': 'Este correo ya está registrado'},
        )
    if crud_usuarios.obtener_por_documento(sesion, datos.numero_documento):
        raise ConflictoDeNegocio(
            'Ya existe un usuario con ese número de documento',
            {'numero_documento': 'Este número de documento ya está registrado'},
        )

    usuario = crud_usuarios.crear(sesion, datos.model_dump(), rol_id=datos.rol_id)
    return {'ok': True, 'message': 'Usuario creado correctamente', 'id_usuario': usuario.id_usuario}


@router.put(
    '/{id_usuario}',
    response_model=RespuestaOk,
    summary='Actualizar un usuario',
    description='Administrador o el propio usuario. Solo el Administrador puede cambiar el rol.',
    responses={409: {'model': DetalleDeError}},
)
def actualizar_usuario(
    id_usuario: IdUsuario,
    datos: UsuarioActualizar,
    sesion: Sesion,
    usuario_actual: UsuarioAutenticado,
):
    exigir_admin_o_propietario(usuario_actual, id_usuario, 'editar')
    usuario = buscar_o_fallar(sesion, id_usuario)

    existente = crud_usuarios.obtener_por_email(sesion, datos.email)
    if existente is not None and existente.id_usuario != id_usuario:
        raise ConflictoDeNegocio(
            'Ese correo ya está en uso por otro usuario',
            {'email': 'Este correo ya está en uso'},
        )

    cambios = datos.model_dump(exclude={'rol_id'})
    # El rol solo lo modifica el Administrador; el resto conserva el suyo.
    if es_administrador(usuario_actual) and datos.rol_id is not None:
        cambios['rol_id'] = datos.rol_id

    crud_usuarios.actualizar(sesion, usuario, cambios)
    return {'ok': True, 'message': 'Usuario actualizado correctamente'}


@router.patch(
    '/{id_usuario}/estado',
    response_model=RespuestaOk,
    summary='Activar o inactivar un usuario',
    description='Solo el Administrador. Permite conservar la información histórica '
                'en lugar de borrar el registro.',
)
def cambiar_estado(
    id_usuario: IdUsuario,
    datos: CambioDeEstado,
    sesion: Sesion,
    administrador: Administrador,
):
    usuario = buscar_o_fallar(sesion, id_usuario)
    if usuario.id_usuario == administrador.id_usuario and datos.estado == 'inactivo':
        raise ConflictoDeNegocio('No puedes inactivar tu propia cuenta')

    crud_usuarios.cambiar_estado(sesion, usuario, datos.estado)
    return {'ok': True, 'message': f'Usuario marcado como {datos.estado}'}


@router.delete(
    '/{id_usuario}',
    response_model=RespuestaOk,
    summary='Eliminar un usuario',
    description='Solo el Administrador. Elimina el registro de forma definitiva.',
    responses={409: {'model': DetalleDeError}},
)
def eliminar_usuario(id_usuario: IdUsuario, sesion: Sesion, administrador: Administrador):
    usuario = buscar_o_fallar(sesion, id_usuario)
    if usuario.id_usuario == administrador.id_usuario:
        raise ConflictoDeNegocio('No puedes eliminar tu propia cuenta')

    crud_usuarios.eliminar(sesion, usuario)
    return {'ok': True, 'message': 'Usuario eliminado correctamente'}
