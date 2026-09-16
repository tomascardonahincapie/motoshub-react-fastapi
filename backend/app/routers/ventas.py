"""Modulo de ventas: registro, historial y cambio de estado.

El alcance de cada consulta depende del rol. Un cliente que llame a
GET /api/ventas recibe unicamente sus propias compras: el filtro no se aplica
en el Frontend, se aplica aqui.
"""

from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Path, Query, status

from app.crud import facturas as crud_facturas
from app.crud import usuarios as crud_usuarios
from app.crud import ventas as crud_ventas
from app.dependencias import (
    AdministradorOEmpleado,
    Sesion,
    UsuarioAutenticado,
    alcance_de_cliente,
)
from app.errores import RecursoNoEncontrado, SinPermisos
from app.models import Usuario, Venta
from app.schemas.comunes import DetalleDeError
from app.schemas.venta import (
    RespuestaListaVentas,
    RespuestaVenta,
    RespuestaVentaCreada,
    VentaCrear,
    VentaEstadoActualizar,
)

router = APIRouter(
    prefix='/api/ventas',
    tags=['Ventas'],
    responses={
        401: {'model': DetalleDeError, 'description': 'Falta el token'},
        403: {'model': DetalleDeError, 'description': 'Token inválido o rol sin permisos'},
        404: {'model': DetalleDeError},
    },
)

IdVenta = Annotated[int, Path(ge=1, description='Identificador de la venta.')]


def buscar_o_fallar(sesion: Sesion, id_venta: int, usuario: Usuario) -> Venta:
    """Trae la venta y comprueba que el usuario tenga derecho a verla."""
    venta = crud_ventas.obtener(sesion, id_venta)
    if venta is None:
        raise RecursoNoEncontrado('Venta')

    propio = alcance_de_cliente(usuario)
    if propio is not None and venta.cliente_id != propio:
        raise SinPermisos('No tienes permiso para consultar esta venta')

    return venta


def _resolver_cliente(sesion: Sesion, usuario: Usuario, cliente_id: int | None) -> Usuario:
    """Decide a nombre de quien queda la venta.

    Un cliente siempre compra para si mismo, aunque envie otro cliente_id en
    la peticion. Solo el administrador y el empleado pueden vender a nombre de
    un tercero.
    """
    if alcance_de_cliente(usuario) is not None or cliente_id is None:
        return usuario

    cliente = crud_usuarios.obtener(sesion, cliente_id)
    if cliente is None:
        raise RecursoNoEncontrado('Cliente')
    return cliente


@router.post(
    '',
    response_model=RespuestaVentaCreada,
    status_code=status.HTTP_201_CREATED,
    summary='Registrar una venta',
    description=(
        'Registra la venta con los productos y servicios indicados. Los precios '
        'se toman del catálogo, nunca de la petición. Descuenta el stock y, si '
        'se pide, emite la factura en el mismo momento.'
    ),
)
def registrar_venta(datos: VentaCrear, sesion: Sesion, usuario: UsuarioAutenticado):
    cliente = _resolver_cliente(sesion, usuario, datos.cliente_id)
    # Cuando el propio cliente compra no hay vendedor que registrar.
    vendedor = None if cliente.id_usuario == usuario.id_usuario else usuario

    venta = crud_ventas.crear(sesion, datos.model_dump(), cliente, vendedor)

    factura = None
    if datos.generar_factura:
        factura = crud_facturas.emitir(sesion, venta)

    return {
        'ok': True,
        'message': f'Venta {venta.numero_venta} registrada correctamente',
        'id_venta': venta.id_venta,
        'numero_venta': venta.numero_venta,
        'total': venta.total,
        'id_factura': factura.id_factura if factura else None,
        'numero_factura': factura.numero_factura if factura else None,
    }


@router.get(
    '',
    response_model=RespuestaListaVentas,
    summary='Consultar el historial de ventas',
    description=(
        'Historial filtrable por fecha, cliente, producto, servicio, estado, '
        'forma de pago y valor. El cliente solo obtiene sus propias compras.'
    ),
)
def historial_de_ventas(
    sesion: Sesion,
    usuario: UsuarioAutenticado,
    desde: Annotated[date | None, Query(description='Fecha inicial (incluida).')] = None,
    hasta: Annotated[date | None, Query(description='Fecha final (incluida).')] = None,
    cliente_id: Annotated[int | None, Query(ge=1)] = None,
    producto_id: Annotated[int | None, Query(ge=1)] = None,
    servicio_id: Annotated[int | None, Query(ge=1)] = None,
    estado: Annotated[str | None, Query(pattern='^(pendiente|pagada|anulada)$')] = None,
    metodo_pago: Annotated[
        str | None, Query(pattern='^(efectivo|tarjeta|transferencia|credito)$'),
    ] = None,
    valor_minimo: Annotated[Decimal | None, Query(ge=0)] = None,
    valor_maximo: Annotated[Decimal | None, Query(ge=0)] = None,
    busqueda: Annotated[str | None, Query(max_length=100, description='N.º de venta, nombre, correo o documento.')] = None,
    limite: Annotated[int, Query(ge=1, le=1000)] = 200,
):
    propio = alcance_de_cliente(usuario)
    ventas = crud_ventas.listar(
        sesion,
        desde=desde,
        hasta=hasta,
        # El filtro del propio cliente tiene prioridad sobre el que llegue.
        cliente_id=propio if propio is not None else cliente_id,
        producto_id=producto_id,
        servicio_id=servicio_id,
        estado=estado,
        metodo_pago=metodo_pago,
        valor_minimo=valor_minimo,
        valor_maximo=valor_maximo,
        busqueda=busqueda,
        limite=limite,
    )
    return {'ok': True, 'ventas': ventas, 'resumen': crud_ventas.resumen(ventas)}


@router.get(
    '/{id_venta}',
    response_model=RespuestaVenta,
    summary='Consultar una venta con su detalle',
)
def obtener_venta(id_venta: IdVenta, sesion: Sesion, usuario: UsuarioAutenticado):
    return {'ok': True, 'venta': buscar_o_fallar(sesion, id_venta, usuario)}


@router.patch(
    '/{id_venta}/estado',
    response_model=RespuestaVenta,
    summary='Cambiar el estado de una venta',
    description=(
        'Reservado a Administrador y Empleado. Anular una venta devuelve las '
        'unidades al inventario y anula también su factura.'
    ),
)
def cambiar_estado_venta(
    id_venta: IdVenta,
    datos: VentaEstadoActualizar,
    sesion: Sesion,
    gestor: AdministradorOEmpleado,
):
    venta = crud_ventas.obtener(sesion, id_venta)
    if venta is None:
        raise RecursoNoEncontrado('Venta')

    return {'ok': True, 'venta': crud_ventas.cambiar_estado(sesion, venta, datos.estado)}
