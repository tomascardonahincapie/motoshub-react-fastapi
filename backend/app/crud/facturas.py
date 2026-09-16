"""Operaciones sobre las facturas de venta."""

from datetime import date
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.configuracion import configuracion
from app.crud.consecutivos import siguiente_numero
from app.crud.ventas import _limites_del_dia, _mover_stock, redondear
from app.errores import ConflictoDeNegocio
from app.models import Factura, Venta

INTENTOS_NUMERACION = 4


def emitir(sesion: Session, venta: Venta, observaciones: str | None = None) -> Factura:
    """Emite la factura de una venta, copiando los datos del cliente.

    Una venta solo puede facturarse una vez y no se factura lo que se anulo.
    """
    if venta.factura is not None:
        raise ConflictoDeNegocio(
            f'La venta {venta.numero_venta} ya tiene la factura {venta.factura.numero_factura}',
        )
    if venta.estado == 'anulada':
        raise ConflictoDeNegocio('No se puede facturar una venta anulada')

    cliente = venta.cliente
    ultimo_error: IntegrityError | None = None

    for _ in range(INTENTOS_NUMERACION):
        factura = Factura(
            numero_factura=siguiente_numero(sesion, Factura.numero_factura, 'FV'),
            venta_id=venta.id_venta,
            cliente_id=venta.cliente_id,
            cliente_nombre=f'{cliente.nombres} {cliente.apellidos}'.strip(),
            cliente_documento=cliente.numero_documento,
            cliente_email=cliente.email,
            cliente_telefono=cliente.telefono,
            cliente_direccion=cliente.direccion,
            subtotal=venta.subtotal,
            descuento=venta.descuento,
            impuestos=venta.impuestos,
            total=venta.total,
            porcentaje_iva=Decimal(configuracion.iva_porcentaje),
            estado='pagada' if venta.estado == 'pagada' else 'emitida',
            observaciones=observaciones,
        )
        sesion.add(factura)

        try:
            sesion.commit()
        except IntegrityError as error:
            sesion.rollback()
            ultimo_error = error
            continue

        sesion.refresh(factura)
        return factura

    raise ultimo_error


def obtener(sesion: Session, id_factura: int) -> Factura | None:
    return sesion.get(Factura, id_factura)


def obtener_por_venta(sesion: Session, id_venta: int) -> Factura | None:
    return sesion.scalar(select(Factura).where(Factura.venta_id == id_venta))


def listar(
    sesion: Session,
    *,
    desde: date | None = None,
    hasta: date | None = None,
    cliente_id: int | None = None,
    estado: str | None = None,
    busqueda: str | None = None,
    limite: int = 200,
) -> list[Factura]:
    """Consulta de facturas por numero, cliente, fecha o estado."""
    consulta = select(Factura)
    inicio, fin = _limites_del_dia(desde, hasta)

    if inicio is not None:
        consulta = consulta.where(Factura.fecha_emision >= inicio)
    if fin is not None:
        consulta = consulta.where(Factura.fecha_emision <= fin)
    if cliente_id is not None:
        consulta = consulta.where(Factura.cliente_id == cliente_id)
    if estado:
        consulta = consulta.where(Factura.estado == estado)

    if busqueda:
        patron = f'%{busqueda.strip()}%'
        # Los datos del cliente estan copiados en la propia factura, asi que
        # la busqueda no necesita cruzar con la tabla de usuarios.
        consulta = consulta.where(or_(
            Factura.numero_factura.like(patron),
            Factura.cliente_nombre.like(patron),
            Factura.cliente_documento.like(patron),
            Factura.cliente_email.like(patron),
        ))

    consulta = consulta.order_by(Factura.fecha_emision.desc(), Factura.id_factura.desc())
    return list(sesion.scalars(consulta.limit(limite)).unique())


def total_facturado(facturas: list[Factura]) -> Decimal:
    """Suma las facturas vigentes; las anuladas no cuentan."""
    return redondear(sum(
        (Decimal(f.total) for f in facturas if f.estado != 'anulada'), Decimal('0'),
    ))


def cambiar_estado(sesion: Session, factura: Factura, estado: str) -> Factura:
    if factura.estado == 'anulada' and estado != 'anulada':
        raise ConflictoDeNegocio('Una factura anulada no puede cambiar de estado')

    venta = factura.venta
    factura.estado = estado

    # La venta y su factura no pueden contar historias distintas.
    if estado == 'anulada' and venta is not None and venta.estado != 'anulada':
        # Anular la factura anula la venta, y el inventario vuelve a su sitio.
        _mover_stock(sesion, venta.detalles, signo=+1)
        venta.estado = 'anulada'
    elif estado == 'pagada' and venta is not None and venta.estado == 'pendiente':
        venta.estado = 'pagada'

    sesion.commit()
    sesion.refresh(factura)
    return factura


def contar(sesion: Session) -> int:
    return sesion.scalar(select(func.count(Factura.id_factura))) or 0
