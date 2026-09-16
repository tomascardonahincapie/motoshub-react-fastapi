"""Reporte diario de ventas en Excel (.xlsx).

El archivo trae dos hojas: "Ventas", con una fila por operacion, y "Detalle",
con una fila por articulo vendido. La segunda es la que permite analizar que
se vendio mas sin tener que desarmar a mano la columna de descripcion.

Se dejan el autofiltro puesto, la primera fila congelada y los importes con
formato de moneda para que el archivo se pueda ordenar y filtrar tal como
llega, sin retocar nada.
"""

from decimal import Decimal
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.servicios.reportes import ETIQUETAS_ESTADO, ETIQUETAS_PAGO, fecha_larga

FORMATO_PESOS = '"$" #,##0'
FORMATO_FECHA = 'dd/mm/yyyy hh:mm'

TINTA = '1A1D25'
NARANJA = 'FF5C1A'
GRIS_SUAVE = 'F3F4F6'

BORDE = Border(*[Side(style='thin', color='D9DCE3')] * 4)

TITULO = Font(name='Calibri', size=15, bold=True, color=TINTA)
SUBTITULO = Font(name='Calibri', size=10, color='6B7280')
CABECERA = Font(name='Calibri', size=10, bold=True, color='FFFFFF')
TOTAL = Font(name='Calibri', size=10, bold=True, color=TINTA)

RELLENO_CABECERA = PatternFill('solid', fgColor=TINTA)
RELLENO_TOTAL = PatternFill('solid', fgColor=GRIS_SUAVE)


def _escribir_cabecera(hoja, columnas: list[tuple[str, int]], fila: int) -> None:
    """Fila de titulos con fondo oscuro y ancho de columna definitivo."""
    for indice, (titulo, ancho) in enumerate(columnas, start=1):
        celda = hoja.cell(row=fila, column=indice, value=titulo)
        celda.font = CABECERA
        celda.fill = RELLENO_CABECERA
        celda.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        celda.border = BORDE
        hoja.column_dimensions[get_column_letter(indice)].width = ancho
    hoja.row_dimensions[fila].height = 26


def _encabezado_hoja(hoja, negocio: dict, titulo: str, reporte: dict, ultima_columna: int) -> int:
    """Escribe el membrete y devuelve la fila donde empieza la tabla."""
    hoja.merge_cells(start_row=1, start_column=1, end_row=1, end_column=ultima_columna)
    celda = hoja.cell(row=1, column=1, value=f"{negocio['nombre']} · {titulo}")
    celda.font = TITULO

    hoja.merge_cells(start_row=2, start_column=1, end_row=2, end_column=ultima_columna)
    detalle = hoja.cell(row=2, column=1, value=(
        f"NIT {negocio['nit']}  ·  {fecha_larga(reporte['fecha'])}  ·  "
        f"Generado el {reporte['generado'].strftime('%d/%m/%Y a las %H:%M')}"
    ))
    detalle.font = SUBTITULO

    return 4


COLUMNAS_VENTAS = [
    ('#', 5), ('N.º de venta', 16), ('Fecha y hora', 18), ('Cliente', 26),
    ('Documento', 14), ('Productos y servicios', 44), ('Unidades', 10),
    ('Forma de pago', 15), ('Estado', 12), ('Subtotal', 15),
    ('Descuento', 13), ('IVA', 14), ('Total', 16),
]

COLUMNAS_DETALLE = [
    ('N.º de venta', 16), ('Fecha', 18), ('Cliente', 26), ('Tipo', 12),
    ('Artículo', 40), ('Cantidad', 10), ('Precio unitario', 16),
    ('Descuento', 13), ('Subtotal', 16), ('Estado de la venta', 17),
]


def _hoja_ventas(libro: Workbook, reporte: dict) -> None:
    hoja = libro.active
    hoja.title = 'Ventas'
    fila = _encabezado_hoja(hoja, reporte['negocio'], 'Reporte diario de ventas',
                            reporte, len(COLUMNAS_VENTAS))
    _escribir_cabecera(hoja, COLUMNAS_VENTAS, fila)
    primera_fila_datos = fila + 1

    for posicion, venta in enumerate(reporte['ventas'], start=1):
        actual = primera_fila_datos + posicion - 1
        valores = [
            posicion,
            venta.numero_venta,
            venta.fecha_venta,
            venta.cliente_nombre,
            venta.cliente.numero_documento if venta.cliente else '',
            ', '.join(f'{d.nombre_item} x{d.cantidad}' for d in venta.detalles),
            venta.cantidad_items,
            ETIQUETAS_PAGO.get(venta.metodo_pago, venta.metodo_pago),
            ETIQUETAS_ESTADO.get(venta.estado, venta.estado),
            float(venta.subtotal), float(venta.descuento),
            float(venta.impuestos), float(venta.total),
        ]
        for indice, valor in enumerate(valores, start=1):
            celda = hoja.cell(row=actual, column=indice, value=valor)
            celda.border = BORDE
            if indice == 3:
                celda.number_format = FORMATO_FECHA
            elif indice >= 10:
                celda.number_format = FORMATO_PESOS
            elif indice in (1, 7):
                celda.alignment = Alignment(horizontal='center')

    ultima = primera_fila_datos + len(reporte['ventas']) - 1

    # --- Fila de totales, con formulas vivas -------------------------------
    fila_total = max(ultima, primera_fila_datos) + 1
    hoja.cell(row=fila_total, column=1, value='TOTALES').font = TOTAL
    for columna in range(1, len(COLUMNAS_VENTAS) + 1):
        celda = hoja.cell(row=fila_total, column=columna)
        celda.fill = RELLENO_TOTAL
        celda.border = BORDE
        celda.font = TOTAL

    if reporte['ventas']:
        for columna in (7, 10, 11, 12, 13):
            letra = get_column_letter(columna)
            celda = hoja.cell(row=fila_total, column=columna)
            # Una formula real, no el numero calculado: si quien recibe el
            # archivo filtra u ordena, el total se sigue leyendo solo.
            celda.value = f'=SUM({letra}{primera_fila_datos}:{letra}{ultima})'
            celda.number_format = FORMATO_PESOS if columna >= 10 else 'General'

        hoja.auto_filter.ref = (
            f'A{fila}:{get_column_letter(len(COLUMNAS_VENTAS))}{ultima}'
        )

    hoja.freeze_panes = hoja.cell(row=primera_fila_datos, column=1)


def _hoja_detalle(libro: Workbook, reporte: dict) -> None:
    """Una fila por articulo vendido: es la hoja util para analizar el dia."""
    hoja = libro.create_sheet('Detalle')
    fila = _encabezado_hoja(hoja, reporte['negocio'], 'Detalle de artículos vendidos',
                            reporte, len(COLUMNAS_DETALLE))
    _escribir_cabecera(hoja, COLUMNAS_DETALLE, fila)

    actual = fila + 1
    for venta in reporte['ventas']:
        for detalle in venta.detalles:
            valores = [
                venta.numero_venta,
                venta.fecha_venta,
                venta.cliente_nombre,
                detalle.tipo_item.capitalize(),
                detalle.nombre_item,
                detalle.cantidad,
                float(detalle.precio_unitario),
                float(detalle.descuento),
                float(detalle.subtotal),
                ETIQUETAS_ESTADO.get(venta.estado, venta.estado),
            ]
            for indice, valor in enumerate(valores, start=1):
                celda = hoja.cell(row=actual, column=indice, value=valor)
                celda.border = BORDE
                if indice == 2:
                    celda.number_format = FORMATO_FECHA
                elif indice in (7, 8, 9):
                    celda.number_format = FORMATO_PESOS
                elif indice == 6:
                    celda.alignment = Alignment(horizontal='center')
            actual += 1

    if actual > fila + 1:
        hoja.auto_filter.ref = (
            f'A{fila}:{get_column_letter(len(COLUMNAS_DETALLE))}{actual - 1}'
        )
    hoja.freeze_panes = hoja.cell(row=fila + 1, column=1)


def _hoja_resumen(libro: Workbook, reporte: dict) -> None:
    """Cifras del dia en una hoja aparte, para pegarlas en una presentacion."""
    hoja = libro.create_sheet('Resumen')
    resumen = reporte['resumen']

    hoja.column_dimensions['A'].width = 30
    hoja.column_dimensions['B'].width = 20

    hoja['A1'] = f"{reporte['negocio']['nombre']} · Resumen del día"
    hoja['A1'].font = TITULO
    hoja['A2'] = fecha_larga(reporte['fecha'])
    hoja['A2'].font = SUBTITULO

    filas = [
        ('Ventas registradas', resumen['cantidad'], 'General'),
        ('Ventas anuladas', resumen['anuladas'], 'General'),
        ('Unidades vendidas', resumen['unidades'], 'General'),
        ('Subtotal', float(resumen['subtotal']), FORMATO_PESOS),
        ('Descuentos', float(resumen['descuento']), FORMATO_PESOS),
        ('IVA', float(resumen['impuestos']), FORMATO_PESOS),
        ('Ticket promedio', float(resumen['ticket_promedio']), FORMATO_PESOS),
        ('Total del día', float(resumen['total']), FORMATO_PESOS),
    ]

    for indice, (etiqueta, valor, formato) in enumerate(filas, start=4):
        celda_etiqueta = hoja.cell(row=indice, column=1, value=etiqueta)
        celda_valor = hoja.cell(row=indice, column=2, value=valor)
        celda_valor.number_format = formato
        for celda in (celda_etiqueta, celda_valor):
            celda.border = BORDE
        if etiqueta == 'Total del día':
            celda_etiqueta.font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
            celda_valor.font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
            relleno = PatternFill('solid', fgColor=NARANJA)
            celda_etiqueta.fill = relleno
            celda_valor.fill = relleno


def reporte_diario(reporte: dict) -> bytes:
    """Arma el libro completo y lo devuelve como bytes listos para descargar."""
    libro = Workbook()
    libro.properties.title = f"Reporte de ventas {reporte['fecha'].isoformat()}"
    libro.properties.creator = reporte['negocio']['nombre']

    _hoja_ventas(libro, reporte)
    _hoja_detalle(libro, reporte)
    _hoja_resumen(libro, reporte)

    buffer = BytesIO()
    libro.save(buffer)
    return buffer.getvalue()
