"""Modulo de facturacion: emision, consulta y descarga en PDF."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Path, Query, Response, status

from app.core.configuracion import configuracion
from app.crud import facturas as crud_facturas
from app.crud import ventas as crud_ventas
from app.dependencias import (
    AdministradorOEmpleado,
    Sesion,
    UsuarioAutenticado,
    alcance_de_cliente,
)
from app.errores import RecursoNoEncontrado, SinPermisos
from app.models import Factura, Usuario
from app.schemas.comunes import DetalleDeError
from app.schemas.factura import (
    FacturaCrear,
    FacturaEstadoActualizar,
    RespuestaFactura,
    RespuestaFacturaCreada,
    RespuestaListaFacturas,
)
from app.servicios import pdf as servicio_pdf

router = APIRouter(
    prefix='/api/facturas',
    tags=['Facturas'],
    responses={
        401: {'model': DetalleDeError, 'description': 'Falta el token'},
        403: {'model': DetalleDeError, 'description': 'Token inválido o rol sin permisos'},
        404: {'model': DetalleDeError},
    },
)

IdFactura = Annotated[int, Path(ge=1, description='Identificador de la factura.')]


def buscar_o_fallar(sesion: Sesion, id_factura: int, usuario: Usuario) -> Factura:
    factura = crud_facturas.obtener(sesion, id_factura)
    if factura is None:
        raise RecursoNoEncontrado('Factura')

    propio = alcance_de_cliente(usuario)
    if propio is not None and factura.cliente_id != propio:
        raise SinPermisos('No tienes permiso para consultar esta factura')

    return factura


def _con_detalle(factura: Factura) -> dict:
    """Aplana la factura con el detalle de su venta, que es donde vive."""
    datos = {
        campo: getattr(factura, campo)
        for campo in (
            'id_factura', 'numero_factura', 'venta_id', 'cliente_id', 'cliente_nombre',
            'cliente_documento', 'cliente_email', 'cliente_telefono', 'cliente_direccion',
            'subtotal', 'descuento', 'impuestos', 'porcentaje_iva', 'total',
            'estado', 'observaciones', 'fecha_emision',
        )
    }
    datos['numero_venta'] = factura.venta.numero_venta if factura.venta else None
    datos['detalles'] = factura.venta.detalles if factura.venta else []
    return datos


@router.post(
    '',
    response_model=RespuestaFacturaCreada,
    status_code=status.HTTP_201_CREATED,
    summary='Emitir la factura de una venta',
    description='Reservado a Administrador y Empleado. Una venta solo se factura una vez.',
)
def emitir_factura(datos: FacturaCrear, sesion: Sesion, gestor: AdministradorOEmpleado):
    venta = crud_ventas.obtener(sesion, datos.venta_id)
    if venta is None:
        raise RecursoNoEncontrado('Venta')

    factura = crud_facturas.emitir(sesion, venta, datos.observaciones)
    return {
        'ok': True,
        'message': f'Factura {factura.numero_factura} emitida correctamente',
        'id_factura': factura.id_factura,
        'numero_factura': factura.numero_factura,
    }


@router.get(
    '',
    response_model=RespuestaListaFacturas,
    summary='Consultar facturas',
    description=(
        'Búsqueda por número de factura, cliente, documento, correo, fecha o '
        'estado. El cliente solo obtiene sus propias facturas.'
    ),
)
def listar_facturas(
    sesion: Sesion,
    usuario: UsuarioAutenticado,
    desde: Annotated[date | None, Query(description='Fecha inicial (incluida).')] = None,
    hasta: Annotated[date | None, Query(description='Fecha final (incluida).')] = None,
    cliente_id: Annotated[int | None, Query(ge=1)] = None,
    estado: Annotated[str | None, Query(pattern='^(emitida|pagada|anulada)$')] = None,
    busqueda: Annotated[str | None, Query(max_length=100)] = None,
    limite: Annotated[int, Query(ge=1, le=1000)] = 200,
):
    propio = alcance_de_cliente(usuario)
    facturas = crud_facturas.listar(
        sesion,
        desde=desde,
        hasta=hasta,
        cliente_id=propio if propio is not None else cliente_id,
        estado=estado,
        busqueda=busqueda,
        limite=limite,
    )
    return {
        'ok': True,
        'facturas': [_con_detalle(f) for f in facturas],
        'total_facturado': crud_facturas.total_facturado(facturas),
    }


@router.get(
    '/{id_factura}',
    response_model=RespuestaFactura,
    summary='Consultar una factura',
)
def obtener_factura(id_factura: IdFactura, sesion: Sesion, usuario: UsuarioAutenticado):
    return {'ok': True, 'factura': _con_detalle(buscar_o_fallar(sesion, id_factura, usuario))}


@router.get(
    '/{id_factura}/pdf',
    summary='Descargar la factura en PDF',
    description='Devuelve el documento listo para imprimir o archivar.',
    response_class=Response,
    responses={200: {'content': {'application/pdf': {}}, 'description': 'Factura en PDF'}},
)
def descargar_factura(id_factura: IdFactura, sesion: Sesion, usuario: UsuarioAutenticado):
    factura = buscar_o_fallar(sesion, id_factura, usuario)

    documento = servicio_pdf.factura(factura, {
        'nombre': configuracion.negocio_nombre,
        'nit': configuracion.negocio_nit,
        'direccion': configuracion.negocio_direccion,
        'ciudad': configuracion.negocio_ciudad,
        'telefono': configuracion.negocio_telefono,
        'email': configuracion.negocio_email,
    })
    nombre = f'{factura.numero_factura}.pdf'

    return Response(
        content=documento,
        media_type='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename="{nombre}"',
            # Sin esto el navegador no puede leer el nombre del archivo.
            'Access-Control-Expose-Headers': 'Content-Disposition',
        },
    )


@router.patch(
    '/{id_factura}/estado',
    response_model=RespuestaFactura,
    summary='Cambiar el estado de una factura',
    description='Reservado a Administrador y Empleado.',
)
def cambiar_estado_factura(
    id_factura: IdFactura,
    datos: FacturaEstadoActualizar,
    sesion: Sesion,
    gestor: AdministradorOEmpleado,
):
    factura = crud_facturas.obtener(sesion, id_factura)
    if factura is None:
        raise RecursoNoEncontrado('Factura')

    actualizada = crud_facturas.cambiar_estado(sesion, factura, datos.estado)
    return {'ok': True, 'factura': _con_detalle(actualizada)}
