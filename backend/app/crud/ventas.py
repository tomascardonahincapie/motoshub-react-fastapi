"""Operaciones sobre las ventas y su detalle.

Aqui vive la regla mas importante del modulo comercial: los precios se leen
del catalogo, jamas de la peticion. El Frontend solo dice que articulo quiere
y cuantas unidades.
"""

from datetime import date, datetime, time
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.configuracion import configuracion
from app.crud.consecutivos import siguiente_numero
from app.errores import ConflictoDeNegocio, RecursoNoEncontrado
from app.models import DetalleVenta, Producto, Servicio, Usuario, Venta

CENTAVOS = Decimal('0.01')
INTENTOS_NUMERACION = 4


def redondear(valor: Decimal) -> Decimal:
    """Deja el importe con dos decimales, redondeando como en contabilidad."""
    return Decimal(valor).quantize(CENTAVOS, rounding=ROUND_HALF_UP)


def _buscar_articulo(sesion: Session, tipo: str, id_item: int):
    """Trae el producto o servicio y comprueba que se pueda vender."""
    if tipo == 'producto':
        articulo = sesion.get(Producto, id_item)
        if articulo is None:
            raise RecursoNoEncontrado(f'Producto {id_item}')
    else:
        articulo = sesion.get(Servicio, id_item)
        if articulo is None:
            raise RecursoNoEncontrado(f'Servicio {id_item}')

    if articulo.estado != 'activo':
        raise ConflictoDeNegocio(f'El artículo "{articulo.nombre}" no está disponible')

    return articulo


def _armar_detalles(sesion: Session, items: list[dict]) -> list[DetalleVenta]:
    """Convierte el carrito en lineas de venta con los precios del catalogo."""
    detalles: list[DetalleVenta] = []
    # Un mismo producto puede venir repetido en el carrito: se acumulan las
    # unidades antes de comprobar el stock, para no aprobarlo de a una linea.
    unidades_pedidas: dict[int, int] = {}

    for item in items:
        tipo = item['tipo_item']
        articulo = _buscar_articulo(sesion, tipo, item['id_item'])
        cantidad = int(item['cantidad'])
        descuento = redondear(item.get('descuento') or 0)

        precio = Decimal(articulo.precio)
        bruto = redondear(precio * cantidad)

        if descuento > bruto:
            raise ConflictoDeNegocio('El descuento supera el valor de la línea')

        if tipo == 'producto':
            pedidas = unidades_pedidas.get(articulo.id_producto, 0) + cantidad
            unidades_pedidas[articulo.id_producto] = pedidas
            if pedidas > articulo.stock:
                raise ConflictoDeNegocio(
                    f'No hay stock suficiente de "{articulo.nombre}": '
                    f'quedan {articulo.stock} unidades',
                )

        detalles.append(DetalleVenta(
            tipo_item=tipo,
            producto_id=articulo.id_producto if tipo == 'producto' else None,
            servicio_id=articulo.id_servicio if tipo == 'servicio' else None,
            nombre_item=articulo.nombre,
            cantidad=cantidad,
            precio_unitario=precio,
            descuento=descuento,
            subtotal=redondear(bruto - descuento),
        ))

    return detalles


def calcular_totales(detalles: list[DetalleVenta]) -> dict[str, Decimal]:
    """Suma las lineas y aplica el IVA sobre la base gravable."""
    subtotal = redondear(sum(
        (Decimal(d.precio_unitario) * d.cantidad for d in detalles), Decimal('0'),
    ))
    descuento = redondear(sum((Decimal(d.descuento) for d in detalles), Decimal('0')))
    base = subtotal - descuento
    impuestos = redondear(base * Decimal(configuracion.iva_porcentaje) / Decimal('100'))

    return {
        'subtotal': subtotal,
        'descuento': descuento,
        'impuestos': impuestos,
        'total': redondear(base + impuestos),
    }


def _mover_stock(sesion: Session, detalles: list[DetalleVenta], signo: int) -> None:
    """Mueve el inventario: signo -1 al vender, +1 al anular la venta."""
    for detalle in detalles:
        if detalle.tipo_item != 'producto' or detalle.producto_id is None:
            continue
        producto = sesion.get(Producto, detalle.producto_id)
        if producto is not None:
            producto.stock = max(0, producto.stock + signo * detalle.cantidad)


def crear(sesion: Session, datos: dict, cliente: Usuario, vendedor: Usuario | None) -> Venta:
    """Registra la venta completa: lineas, totales y movimiento de inventario."""
    detalles = _armar_detalles(sesion, datos['items'])
    totales = calcular_totales(detalles)

    # El estado inicial depende de como se pago: lo que entra por caja o por
    # transferencia queda pagado; el credito queda pendiente de cobro.
    metodo = datos.get('metodo_pago', 'efectivo')
    estado = 'pendiente' if metodo == 'credito' else 'pagada'

    ultimo_error: IntegrityError | None = None

    for _ in range(INTENTOS_NUMERACION):
        venta = Venta(
            numero_venta=siguiente_numero(sesion, Venta.numero_venta, 'V'),
            cliente_id=cliente.id_usuario,
            usuario_id=vendedor.id_usuario if vendedor else None,
            metodo_pago=metodo,
            observaciones=datos.get('observaciones'),
            estado=estado,
            **totales,
        )
        venta.detalles = detalles
        sesion.add(venta)

        try:
            _mover_stock(sesion, detalles, signo=-1)
            sesion.commit()
        except IntegrityError as error:
            # Otra venta se llevo el mismo consecutivo: se pide el siguiente.
            sesion.rollback()
            ultimo_error = error
            continue

        sesion.refresh(venta)
        return venta

    raise ultimo_error


def _limites_del_dia(desde: date | None, hasta: date | None):
    """Convierte las fechas del filtro en instantes que cubren el dia entero."""
    inicio = datetime.combine(desde, time.min) if desde else None
    fin = datetime.combine(hasta, time.max) if hasta else None
    return inicio, fin


def listar(
    sesion: Session,
    *,
    desde: date | None = None,
    hasta: date | None = None,
    cliente_id: int | None = None,
    producto_id: int | None = None,
    servicio_id: int | None = None,
    estado: str | None = None,
    metodo_pago: str | None = None,
    valor_minimo: Decimal | None = None,
    valor_maximo: Decimal | None = None,
    busqueda: str | None = None,
    limite: int = 200,
) -> list[Venta]:
    """Historial de ventas con los criterios que pide el quinto avance."""
    consulta = select(Venta)
    inicio, fin = _limites_del_dia(desde, hasta)

    if inicio is not None:
        consulta = consulta.where(Venta.fecha_venta >= inicio)
    if fin is not None:
        consulta = consulta.where(Venta.fecha_venta <= fin)
    if cliente_id is not None:
        consulta = consulta.where(Venta.cliente_id == cliente_id)
    if estado:
        consulta = consulta.where(Venta.estado == estado)
    if metodo_pago:
        consulta = consulta.where(Venta.metodo_pago == metodo_pago)
    if valor_minimo is not None:
        consulta = consulta.where(Venta.total >= valor_minimo)
    if valor_maximo is not None:
        consulta = consulta.where(Venta.total <= valor_maximo)

    # Filtrar por articulo obliga a mirar el detalle de cada venta.
    if producto_id is not None or servicio_id is not None:
        condiciones = []
        if producto_id is not None:
            condiciones.append(DetalleVenta.producto_id == producto_id)
        if servicio_id is not None:
            condiciones.append(DetalleVenta.servicio_id == servicio_id)
        consulta = consulta.where(
            select(DetalleVenta.id_detalle)
            .where(DetalleVenta.venta_id == Venta.id_venta)
            .where(or_(*condiciones))
            .exists(),
        )

    if busqueda:
        patron = f'%{busqueda.strip()}%'
        consulta = consulta.join(Usuario, Venta.cliente_id == Usuario.id_usuario).where(
            or_(
                Venta.numero_venta.like(patron),
                Usuario.nombres.like(patron),
                Usuario.apellidos.like(patron),
                Usuario.email.like(patron),
                Usuario.numero_documento.like(patron),
            ),
        )

    consulta = consulta.order_by(Venta.fecha_venta.desc(), Venta.id_venta.desc()).limit(limite)
    return list(sesion.scalars(consulta).unique())


def obtener(sesion: Session, id_venta: int) -> Venta | None:
    return sesion.get(Venta, id_venta)


def resumen(ventas: list[Venta]) -> dict:
    """Totales del listado que se acaba de consultar.

    Las ventas anuladas aparecen en el listado pero no suman dinero: si lo
    hicieran, el total del historial no cuadraria con lo realmente facturado.
    """
    validas = [v for v in ventas if v.estado != 'anulada']
    total = redondear(sum((Decimal(v.total) for v in validas), Decimal('0')))

    return {
        'cantidad': len(ventas),
        'total': total,
        'subtotal': redondear(sum((Decimal(v.subtotal) for v in validas), Decimal('0'))),
        'impuestos': redondear(sum((Decimal(v.impuestos) for v in validas), Decimal('0'))),
        'descuento': redondear(sum((Decimal(v.descuento) for v in validas), Decimal('0'))),
        'ticket_promedio': redondear(total / len(validas)) if validas else Decimal('0'),
    }


def cambiar_estado(sesion: Session, venta: Venta, estado: str) -> Venta:
    """Cambia el estado y devuelve el inventario cuando la venta se anula."""
    if venta.estado == estado:
        return venta

    if venta.estado == 'anulada':
        raise ConflictoDeNegocio('Una venta anulada no puede cambiar de estado')

    if estado == 'anulada':
        _mover_stock(sesion, venta.detalles, signo=+1)
        if venta.factura is not None:
            venta.factura.estado = 'anulada'
    elif estado == 'pagada' and venta.factura is not None:
        venta.factura.estado = 'pagada'

    venta.estado = estado
    sesion.commit()
    sesion.refresh(venta)
    return venta


def contar(sesion: Session) -> int:
    return sesion.scalar(select(func.count(Venta.id_venta))) or 0
