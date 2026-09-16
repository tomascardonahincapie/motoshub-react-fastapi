"""Generacion del reporte diario de ventas y de las facturas.

El mismo conjunto de datos se entrega en tres formatos: JSON para la pantalla,
PDF para imprimir o archivar y Excel para seguir analizando las cifras.

Los importes se escriben en pesos colombianos con separador de miles, que es
como los lee quien recibe el documento.
"""

from datetime import date, datetime
from decimal import Decimal
from io import BytesIO

from sqlalchemy.orm import Session

from app.core.configuracion import configuracion
from app.crud import ventas as crud_ventas
from app.models import Venta

MESES_LARGOS = (
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
)

ETIQUETAS_ESTADO = {'pendiente': 'Pendiente', 'pagada': 'Pagada', 'anulada': 'Anulada'}
ETIQUETAS_PAGO = {
    'efectivo': 'Efectivo', 'tarjeta': 'Tarjeta',
    'transferencia': 'Transferencia', 'credito': 'Crédito',
}


def pesos(valor) -> str:
    """25500000 -> "$ 25.500.000". Sin decimales: el peso no los usa a diario."""
    entero = int(Decimal(valor or 0).quantize(Decimal('1')))
    return f'$ {entero:,}'.replace(',', '.')


def fecha_larga(dia: date) -> str:
    return f'{dia.day} de {MESES_LARGOS[dia.month - 1]} de {dia.year}'


def descripcion_items(venta: Venta, separador: str = ', ') -> str:
    """Resume el detalle de la venta en una linea legible."""
    return separador.join(
        f'{d.nombre_item} x{d.cantidad}' for d in venta.detalles
    ) or 'Sin detalle'


def datos_reporte(sesion: Session, dia: date) -> dict:
    """Reune todo lo vendido en una fecha, con sus totales."""
    ventas = crud_ventas.listar(sesion, desde=dia, hasta=dia, limite=1000)
    # El listado viene de la mas reciente a la mas antigua; en un reporte
    # impreso se lee mejor en el orden en que ocurrieron las ventas.
    ventas = sorted(ventas, key=lambda v: v.fecha_venta)

    resumen = crud_ventas.resumen(ventas)
    resumen['anuladas'] = sum(1 for v in ventas if v.estado == 'anulada')
    resumen['unidades'] = sum(
        d.cantidad for v in ventas if v.estado != 'anulada' for d in v.detalles
    )

    return {
        'fecha': dia,
        'generado': datetime.now(),
        'negocio': {
            'nombre': configuracion.negocio_nombre,
            'nit': configuracion.negocio_nit,
            'direccion': configuracion.negocio_direccion,
            'ciudad': configuracion.negocio_ciudad,
            'telefono': configuracion.negocio_telefono,
            'email': configuracion.negocio_email,
        },
        'ventas': ventas,
        'resumen': resumen,
    }


def nombre_archivo(dia: date, extension: str) -> str:
    return f'reporte_ventas_{dia.isoformat()}.{extension}'
