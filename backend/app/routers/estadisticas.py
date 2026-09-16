"""Indicadores y graficos de los Dashboards.

Todo lo que React pinta en los Dashboards sale de estos dos endpoints: ni un
solo numero esta escrito a mano en el Frontend.

Los tres roles llaman a las mismas rutas y reciben respuestas distintas: el
recorte por rol se decide aqui, no en el navegador.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from app.crud import estadisticas as crud_estadisticas
from app.crud import ventas as crud_ventas
from app.dependencias import Sesion, UsuarioAutenticado, alcance_de_cliente
from app.schemas.comunes import DetalleDeError
from app.schemas.estadisticas import RespuestaDashboardVentas, RespuestaResumen

router = APIRouter(
    prefix='/api/estadisticas',
    tags=['Estadisticas'],
    responses={
        401: {'model': DetalleDeError, 'description': 'Falta el token'},
        403: {'model': DetalleDeError, 'description': 'Token inválido'},
    },
)


@router.get(
    '/resumen',
    response_model=RespuestaResumen,
    summary='Indicadores del Dashboard',
    description=(
        'Tarjetas del panel, recortadas al rol de quien consulta: el '
        'Administrador ve todo el sistema, el Empleado la operación comercial '
        'y el Cliente únicamente sus propias cifras.'
    ),
)
def resumen(sesion: Sesion, usuario: UsuarioAutenticado):
    propio = alcance_de_cliente(usuario)
    desde, hasta = crud_estadisticas.rango_por_defecto()

    ventas = crud_ventas.listar(sesion, desde=desde, hasta=hasta, cliente_id=propio, limite=1000)

    return {
        'ok': True,
        'rol': usuario.nombre_rol,
        'indicadores': crud_estadisticas.indicadores(sesion, usuario, ventas, desde, hasta),
    }


@router.get(
    '/ventas',
    response_model=RespuestaDashboardVentas,
    summary='Dashboard de ventas: serie, ranking y repartos',
    description=(
        'Devuelve la serie temporal que alimenta el gráfico de barras y el '
        'gráfico lineal, el ranking de lo más vendido y el reparto por estado y '
        'forma de pago. Todo respeta los filtros y el rol del usuario.'
    ),
)
def dashboard_de_ventas(
    sesion: Sesion,
    usuario: UsuarioAutenticado,
    desde: Annotated[date | None, Query(description='Fecha inicial. Por omisión, hace 30 días.')] = None,
    hasta: Annotated[date | None, Query(description='Fecha final. Por omisión, hoy.')] = None,
    agrupar: Annotated[str, Query(pattern='^(dia|semana|mes)$')] = 'dia',
    estado: Annotated[str | None, Query(pattern='^(pendiente|pagada|anulada)$')] = None,
    metodo_pago: Annotated[
        str | None, Query(pattern='^(efectivo|tarjeta|transferencia|credito)$'),
    ] = None,
    cliente_id: Annotated[int | None, Query(ge=1)] = None,
    producto_id: Annotated[int | None, Query(ge=1)] = None,
    servicio_id: Annotated[int | None, Query(ge=1)] = None,
):
    por_defecto = crud_estadisticas.rango_por_defecto()
    inicio = desde or por_defecto[0]
    fin = hasta or por_defecto[1]
    # Un rango al reves no es un error del usuario: se endereza y ya.
    if inicio > fin:
        inicio, fin = fin, inicio

    propio = alcance_de_cliente(usuario)
    ventas = crud_ventas.listar(
        sesion,
        desde=inicio,
        hasta=fin,
        cliente_id=propio if propio is not None else cliente_id,
        estado=estado,
        metodo_pago=metodo_pago,
        producto_id=producto_id,
        servicio_id=servicio_id,
        limite=5000,
    )

    return {
        'ok': True,
        'rol': usuario.nombre_rol,
        'agrupacion': agrupar,
        'desde': inicio,
        'hasta': fin,
        'indicadores': crud_estadisticas.indicadores(sesion, usuario, ventas, inicio, fin),
        'serie': crud_estadisticas.serie_de_ventas(ventas, inicio, fin, agrupar),
        'ranking': crud_estadisticas.ranking_articulos(ventas),
        'por_estado': crud_estadisticas.repartir_por_estado(ventas),
        'por_metodo_pago': crud_estadisticas.repartir_por_metodo_pago(ventas),
    }
