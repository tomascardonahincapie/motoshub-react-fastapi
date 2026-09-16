"""Modulo de PQR: radicacion por parte del cliente y gestion por el equipo."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Path, Query, status

from app.crud import pqr as crud_pqr
from app.crud import usuarios as crud_usuarios
from app.dependencias import (
    AdministradorOEmpleado,
    Sesion,
    UsuarioAutenticado,
    alcance_de_cliente,
)
from app.errores import RecursoNoEncontrado, SinPermisos
from app.models import Pqr, Usuario
from app.schemas.comunes import DetalleDeError
from app.schemas.pqr import (
    PqrCrear,
    PqrResponder,
    RespuestaListaPqr,
    RespuestaPqr,
    RespuestaPqrCreada,
)

router = APIRouter(
    prefix='/api/pqr',
    tags=['PQR'],
    responses={
        401: {'model': DetalleDeError, 'description': 'Falta el token'},
        403: {'model': DetalleDeError, 'description': 'Token inválido o rol sin permisos'},
        404: {'model': DetalleDeError},
    },
)

IdPqr = Annotated[int, Path(ge=1, description='Identificador de la PQR.')]


def buscar_o_fallar(sesion: Sesion, id_pqr: int, usuario: Usuario) -> Pqr:
    registro = crud_pqr.obtener(sesion, id_pqr)
    if registro is None:
        raise RecursoNoEncontrado('PQR')

    propio = alcance_de_cliente(usuario)
    if propio is not None and registro.cliente_id != propio:
        raise SinPermisos('No tienes permiso para consultar esta PQR')

    return registro


@router.post(
    '',
    response_model=RespuestaPqrCreada,
    status_code=status.HTTP_201_CREATED,
    summary='Radicar una PQR',
    description=(
        'Cualquier usuario autenticado puede radicar su solicitud y recibe un '
        'número de radicado para hacerle seguimiento.'
    ),
)
def radicar_pqr(datos: PqrCrear, sesion: Sesion, usuario: UsuarioAutenticado):
    # Un cliente siempre radica a su propio nombre, aunque envie otro cliente_id.
    cliente = usuario
    if alcance_de_cliente(usuario) is None and datos.cliente_id is not None:
        cliente = crud_usuarios.obtener(sesion, datos.cliente_id)
        if cliente is None:
            raise RecursoNoEncontrado('Cliente')

    registro = crud_pqr.crear(sesion, datos.model_dump(), cliente)
    return {
        'ok': True,
        'message': f'PQR radicada con el número {registro.radicado}',
        'id_pqr': registro.id_pqr,
        'radicado': registro.radicado,
    }


@router.get(
    '',
    response_model=RespuestaListaPqr,
    summary='Consultar PQR',
    description='El cliente ve solo las suyas; Administrador y Empleado las ven todas.',
)
def listar_pqr(
    sesion: Sesion,
    usuario: UsuarioAutenticado,
    tipo: Annotated[str | None, Query(pattern='^(peticion|queja|reclamo|sugerencia)$')] = None,
    estado: Annotated[
        str | None, Query(pattern='^(pendiente|en_proceso|respondida|cerrada)$'),
    ] = None,
    cliente_id: Annotated[int | None, Query(ge=1)] = None,
    desde: Annotated[date | None, Query()] = None,
    hasta: Annotated[date | None, Query()] = None,
    busqueda: Annotated[str | None, Query(max_length=100, description='Radicado, asunto o descripción.')] = None,
    limite: Annotated[int, Query(ge=1, le=1000)] = 200,
):
    propio = alcance_de_cliente(usuario)
    alcance = propio if propio is not None else cliente_id

    registros = crud_pqr.listar(
        sesion,
        cliente_id=alcance,
        tipo=tipo,
        estado=estado,
        desde=desde,
        hasta=hasta,
        busqueda=busqueda,
        limite=limite,
    )
    return {'ok': True, 'pqr': registros, 'resumen': crud_pqr.resumen(sesion, alcance)}


@router.get('/{id_pqr}', response_model=RespuestaPqr, summary='Consultar una PQR')
def obtener_pqr(id_pqr: IdPqr, sesion: Sesion, usuario: UsuarioAutenticado):
    return {'ok': True, 'pqr': buscar_o_fallar(sesion, id_pqr, usuario)}


@router.patch(
    '/{id_pqr}',
    response_model=RespuestaPqr,
    summary='Responder o cambiar el estado de una PQR',
    description='Reservado a Administrador y Empleado.',
)
def responder_pqr(
    id_pqr: IdPqr,
    datos: PqrResponder,
    sesion: Sesion,
    agente: AdministradorOEmpleado,
):
    registro = crud_pqr.obtener(sesion, id_pqr)
    if registro is None:
        raise RecursoNoEncontrado('PQR')

    return {'ok': True, 'pqr': crud_pqr.responder(sesion, registro, datos.model_dump(), agente)}
