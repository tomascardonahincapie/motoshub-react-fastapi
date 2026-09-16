"""Indicadores y series que alimentan los Dashboards.

El agrupamiento por dia, semana o mes se hace en Python y no en SQL a
proposito: MySQL y SQLite escriben esas funciones de fecha de forma distinta
(YEARWEEK frente a strftime) y la bateria de pruebas corre sobre SQLite. Con
el volumen de datos de una tienda esta diferencia no se nota, y a cambio el
mismo codigo funciona en las dos bases.

El alcance de cada consulta depende del rol: un cliente solo suma sus propias
ventas, aunque llame exactamente al mismo endpoint que el administrador.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crud.ventas import redondear
from app.models import (
    DetalleVenta,
    Factura,
    Producto,
    Pqr,
    Servicio,
    Usuario,
    Venta,
)

MESES = ('ene', 'feb', 'mar', 'abr', 'may', 'jun',
         'jul', 'ago', 'sep', 'oct', 'nov', 'dic')

ETIQUETAS_ESTADO = {
    'pendiente': 'Pendiente', 'pagada': 'Pagada', 'anulada': 'Anulada',
}
ETIQUETAS_PAGO = {
    'efectivo': 'Efectivo', 'tarjeta': 'Tarjeta',
    'transferencia': 'Transferencia', 'credito': 'Crédito',
}

DIAS_POR_DEFECTO = 30


def rango_por_defecto() -> tuple[date, date]:
    """Ultimos 30 dias contando hoy."""
    hoy = date.today()
    return hoy - timedelta(days=DIAS_POR_DEFECTO - 1), hoy


def _clave_periodo(momento: datetime, agrupacion: str) -> tuple[str, str]:
    """Devuelve (clave ordenable, etiqueta corta para el eje X)."""
    if agrupacion == 'mes':
        return f'{momento.year}-{momento.month:02d}', f'{MESES[momento.month - 1]} {momento.year}'

    if agrupacion == 'semana':
        ano_iso, semana, _ = momento.isocalendar()
        return f'{ano_iso}-S{semana:02d}', f'Sem {semana}'

    return momento.date().isoformat(), f'{momento.day} {MESES[momento.month - 1]}'


def _periodos_del_rango(desde: date, hasta: date, agrupacion: str) -> list[tuple[str, str]]:
    """Todas las casillas del eje X, incluidas las que no tuvieron ventas.

    Sin esto el grafico se saltaria los dias sin movimiento y daria a entender
    que las ventas fueron continuas.
    """
    vistos: dict[str, str] = {}
    cursor = desde

    while cursor <= hasta:
        clave, etiqueta = _clave_periodo(datetime.combine(cursor, datetime.min.time()), agrupacion)
        vistos.setdefault(clave, etiqueta)
        cursor += timedelta(days=1)

    return sorted(vistos.items())


def serie_de_ventas(ventas: list[Venta], desde: date, hasta: date, agrupacion: str) -> list[dict]:
    """Serie temporal que comparten el grafico de barras y el lineal."""
    acumulado: dict[str, dict] = {
        clave: {'periodo': clave, 'etiqueta': etiqueta,
                'total': Decimal('0'), 'cantidad': 0}
        for clave, etiqueta in _periodos_del_rango(desde, hasta, agrupacion)
    }

    for venta in ventas:
        if venta.estado == 'anulada':
            continue
        clave, etiqueta = _clave_periodo(venta.fecha_venta, agrupacion)
        casilla = acumulado.setdefault(
            clave, {'periodo': clave, 'etiqueta': etiqueta,
                    'total': Decimal('0'), 'cantidad': 0},
        )
        casilla['total'] += Decimal(venta.total)
        casilla['cantidad'] += 1

    for casilla in acumulado.values():
        casilla['total'] = redondear(casilla['total'])

    return [acumulado[clave] for clave in sorted(acumulado)]


def ranking_articulos(ventas: list[Venta], tope: int = 8) -> list[dict]:
    """Lo mas vendido en el periodo, ordenado por unidades."""
    acumulado: dict[tuple[str, str], dict] = {}

    for venta in ventas:
        if venta.estado == 'anulada':
            continue
        for detalle in venta.detalles:
            llave = (detalle.tipo_item, detalle.nombre_item)
            fila = acumulado.setdefault(llave, {
                'nombre': detalle.nombre_item,
                'tipo': detalle.tipo_item,
                'cantidad': 0,
                'total': Decimal('0'),
            })
            fila['cantidad'] += detalle.cantidad
            fila['total'] += Decimal(detalle.subtotal)

    filas = sorted(acumulado.values(), key=lambda f: (f['cantidad'], f['total']), reverse=True)
    for fila in filas:
        fila['total'] = redondear(fila['total'])
    return filas[:tope]


def _repartir(ventas: list[Venta], campo: str, etiquetas: dict[str, str]) -> list[dict]:
    """Cuenta las ventas agrupadas por estado o por metodo de pago."""
    acumulado: dict[str, dict] = {}

    for venta in ventas:
        clave = getattr(venta, campo)
        fila = acumulado.setdefault(clave, {
            'clave': clave,
            'etiqueta': etiquetas.get(clave, clave.capitalize()),
            'cantidad': 0,
            'total': Decimal('0'),
        })
        fila['cantidad'] += 1
        if venta.estado != 'anulada':
            fila['total'] += Decimal(venta.total)

    for fila in acumulado.values():
        fila['total'] = redondear(fila['total'])

    return sorted(acumulado.values(), key=lambda f: f['cantidad'], reverse=True)


def repartir_por_estado(ventas: list[Venta]) -> list[dict]:
    return _repartir(ventas, 'estado', ETIQUETAS_ESTADO)


def repartir_por_metodo_pago(ventas: list[Venta]) -> list[dict]:
    return _repartir(ventas, 'metodo_pago', ETIQUETAS_PAGO)


def _suma_ventas(sesion: Session, desde: date, hasta: date, cliente_id: int | None) -> tuple[int, Decimal]:
    """Cuantas ventas y cuanto dinero en un rango, sin contar las anuladas."""
    consulta = (
        select(func.count(Venta.id_venta), func.coalesce(func.sum(Venta.total), 0))
        .where(Venta.estado != 'anulada')
        .where(func.date(Venta.fecha_venta) >= desde)
        .where(func.date(Venta.fecha_venta) <= hasta)
    )
    if cliente_id is not None:
        consulta = consulta.where(Venta.cliente_id == cliente_id)

    cantidad, total = sesion.execute(consulta).one()
    return int(cantidad or 0), redondear(Decimal(total or 0))


def indicadores(
    sesion: Session,
    usuario: Usuario,
    ventas: list[Venta],
    desde: date | None = None,
    hasta: date | None = None,
) -> dict:
    """Tarjetas del Dashboard, recortadas a lo que el rol puede ver.

    `ventas` ya viene filtrada y limitada al alcance del usuario, asi que las
    cifras describen exactamente lo que el Dashboard esta mostrando. Las
    facturas se acotan al mismo rango de fechas: si no, la tarjeta de facturas
    contaria toda la historia y no cuadraria con la de ventas justo al lado.
    """
    rol = usuario.nombre_rol
    es_cliente = rol == 'Cliente'
    cliente_id = usuario.id_usuario if es_cliente else None

    validas = [v for v in ventas if v.estado != 'anulada']
    total_ventas = redondear(sum((Decimal(v.total) for v in validas), Decimal('0')))

    consulta_facturas = select(
        func.count(Factura.id_factura), func.coalesce(func.sum(Factura.total), 0),
    ).where(Factura.estado != 'anulada')
    if cliente_id is not None:
        consulta_facturas = consulta_facturas.where(Factura.cliente_id == cliente_id)
    if desde is not None:
        consulta_facturas = consulta_facturas.where(func.date(Factura.fecha_emision) >= desde)
    if hasta is not None:
        consulta_facturas = consulta_facturas.where(func.date(Factura.fecha_emision) <= hasta)
    facturas_cantidad, facturas_total = sesion.execute(consulta_facturas).one()

    consulta_pqr = select(Pqr.estado, func.count(Pqr.id_pqr)).group_by(Pqr.estado)
    if cliente_id is not None:
        consulta_pqr = consulta_pqr.where(Pqr.cliente_id == cliente_id)
    pqr_por_estado = dict(sesion.execute(consulta_pqr).all())

    datos = {
        'ventas_cantidad': len(validas),
        'ventas_total': total_ventas,
        'ticket_promedio': redondear(total_ventas / len(validas)) if validas else Decimal('0'),
        'facturas_cantidad': int(facturas_cantidad or 0),
        'facturas_total': redondear(Decimal(facturas_total or 0)),
        'pqr_total': sum(pqr_por_estado.values()),
        'pqr_pendientes': (
            pqr_por_estado.get('pendiente', 0) + pqr_por_estado.get('en_proceso', 0)
        ),
    }

    if es_cliente:
        return datos

    # --- A partir de aqui, solo Administrador y Empleado ------------------
    hoy = date.today()
    hoy_cantidad, hoy_total = _suma_ventas(sesion, hoy, hoy, None)
    _, mes_total = _suma_ventas(sesion, hoy.replace(day=1), hoy, None)

    cuantos_productos, valor_inventario = sesion.execute(
        select(
            func.count(Producto.id_producto),
            func.coalesce(func.sum(Producto.precio * Producto.stock), 0),
        ),
    ).one()

    datos.update({
        'ventas_hoy_cantidad': hoy_cantidad,
        'ventas_hoy_total': hoy_total,
        'ventas_mes_total': mes_total,
        'productos': int(cuantos_productos or 0),
        'servicios': sesion.scalar(select(func.count(Servicio.id_servicio))) or 0,
        'valor_inventario': redondear(Decimal(valor_inventario or 0)),
        'productos_sin_stock': sesion.scalar(
            select(func.count(Producto.id_producto)).where(Producto.stock <= 0),
        ) or 0,
    })

    if rol != 'Administrador':
        return datos

    # --- Solo Administrador ------------------------------------------------
    datos.update({
        'usuarios': sesion.scalar(select(func.count(Usuario.id_usuario))) or 0,
        'usuarios_activos': sesion.scalar(
            select(func.count(Usuario.id_usuario)).where(Usuario.estado == 'activo'),
        ) or 0,
        'clientes': sesion.scalar(
            select(func.count(Usuario.id_usuario)).where(Usuario.rol_id == 3),
        ) or 0,
    })
    return datos
