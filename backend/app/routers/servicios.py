"""CRUD de servicios. La consulta es pública; la gestión exige rol."""

from typing import Annotated

from fastapi import APIRouter, Path, status

from app.crud import servicios as crud_servicios
from app.dependencias import Administrador, AdministradorOEmpleado, Sesion
from app.errores import RecursoNoEncontrado
from app.schemas.comunes import DetalleDeError, RespuestaOk
from app.schemas.servicio import (
    RespuestaListaServicios,
    RespuestaServicio,
    RespuestaServicioCreado,
    ServicioActualizar,
    ServicioCrear,
)

router = APIRouter(
    prefix='/api/servicios',
    tags=['Servicios'],
    responses={404: {'model': DetalleDeError}},
)

IdServicio = Annotated[int, Path(ge=1, description='Identificador del servicio.')]

RESPUESTAS_PROTEGIDAS = {
    401: {'model': DetalleDeError, 'description': 'Falta el token'},
    403: {'model': DetalleDeError, 'description': 'Token inválido o rol sin permisos'},
}


def buscar_o_fallar(sesion: Sesion, id_servicio: int):
    servicio = crud_servicios.obtener(sesion, id_servicio)
    if servicio is None:
        raise RecursoNoEncontrado('Servicio')
    return servicio


@router.get(
    '',
    response_model=RespuestaListaServicios,
    summary='Listar el catálogo de servicios',
    description='Consulta pública: cualquier visitante puede ver el catálogo.',
)
def listar_servicios(sesion: Sesion):
    return {'ok': True, 'servicios': crud_servicios.listar(sesion)}


@router.get(
    '/{id_servicio}',
    response_model=RespuestaServicio,
    summary='Consultar un servicio',
    description='Consulta pública.',
)
def obtener_servicio(id_servicio: IdServicio, sesion: Sesion):
    return {'ok': True, 'servicio': buscar_o_fallar(sesion, id_servicio)}


@router.post(
    '',
    response_model=RespuestaServicioCreado,
    status_code=status.HTTP_201_CREATED,
    summary='Crear un servicio',
    description='Requiere rol Administrador o Empleado.',
    responses=RESPUESTAS_PROTEGIDAS,
)
def crear_servicio(datos: ServicioCrear, sesion: Sesion, gestor: AdministradorOEmpleado):
    servicio = crud_servicios.crear(sesion, datos.model_dump())
    return {'ok': True, 'message': 'Servicio creado correctamente', 'id_servicio': servicio.id_servicio}


@router.put(
    '/{id_servicio}',
    response_model=RespuestaOk,
    summary='Actualizar un servicio',
    description='Requiere rol Administrador o Empleado.',
    responses=RESPUESTAS_PROTEGIDAS,
)
def actualizar_servicio(
    id_servicio: IdServicio,
    datos: ServicioActualizar,
    sesion: Sesion,
    gestor: AdministradorOEmpleado,
):
    servicio = buscar_o_fallar(sesion, id_servicio)
    crud_servicios.actualizar(sesion, servicio, datos.model_dump())
    return {'ok': True, 'message': 'Servicio actualizado correctamente'}


@router.delete(
    '/{id_servicio}',
    response_model=RespuestaOk,
    summary='Eliminar un servicio',
    description='Reservado al Administrador.',
    responses=RESPUESTAS_PROTEGIDAS,
)
def eliminar_servicio(id_servicio: IdServicio, sesion: Sesion, administrador: Administrador):
    servicio = buscar_o_fallar(sesion, id_servicio)
    crud_servicios.eliminar(sesion, servicio)
    return {'ok': True, 'message': 'Servicio eliminado correctamente'}
