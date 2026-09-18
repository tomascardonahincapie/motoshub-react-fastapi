"""Documentos PDF: reporte diario de ventas y factura de venta.

Se usa ReportLab con la API de alto nivel (Platypus), que reparte el contenido
en paginas por si mismo: un reporte con cien ventas no se sale de la hoja.
"""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.servicios.reportes import (
    ETIQUETAS_ESTADO,
    ETIQUETAS_PAGO,
    descripcion_items,
    fecha_larga,
    pesos,
)

# Paleta: el naranja de la marca sobre papel blanco.
NARANJA = colors.HexColor('#ff5c1a')
TINTA = colors.HexColor('#1a1d25')
GRIS = colors.HexColor('#6b7280')
GRIS_SUAVE = colors.HexColor('#f3f4f6')
LINEA = colors.HexColor('#d9dce3')

_base = getSampleStyleSheet()

ESTILOS = {
    'titulo': ParagraphStyle(
        'titulo', parent=_base['Heading1'], fontSize=17, leading=21,
        textColor=TINTA, spaceAfter=2,
    ),
    'marca': ParagraphStyle(
        'marca', parent=_base['Normal'], fontSize=15, leading=18,
        textColor=NARANJA, fontName='Helvetica-Bold',
    ),
    'normal': ParagraphStyle(
        'normal', parent=_base['Normal'], fontSize=8.5, leading=11.5, textColor=TINTA,
    ),
    'gris': ParagraphStyle(
        'gris', parent=_base['Normal'], fontSize=8, leading=11, textColor=GRIS,
    ),
    'gris_derecha': ParagraphStyle(
        'gris_derecha', parent=_base['Normal'], fontSize=8, leading=11,
        textColor=GRIS, alignment=TA_RIGHT,
    ),
    'celda': ParagraphStyle(
        'celda', parent=_base['Normal'], fontSize=7.6, leading=10, textColor=TINTA,
    ),
    'total_etiqueta': ParagraphStyle(
        'total_etiqueta', parent=_base['Normal'], fontSize=9, leading=12,
        textColor=colors.white, fontName='Helvetica-Bold',
    ),
    'total_valor': ParagraphStyle(
        'total_valor', parent=_base['Normal'], fontSize=10, leading=13,
        textColor=colors.white, fontName='Helvetica-Bold', alignment=TA_RIGHT,
    ),
    'pie': ParagraphStyle(
        'pie', parent=_base['Normal'], fontSize=7, leading=9,
        textColor=GRIS, alignment=TA_CENTER,
    ),
}


def _pie_de_pagina(lienzo, documento):
    """Numero de pagina y sello de generacion en cada hoja."""
    lienzo.saveState()
    lienzo.setFont('Helvetica', 7)
    lienzo.setFillColor(GRIS)
    lienzo.drawCentredString(
        A4[0] / 2, 12 * mm,
        f'{documento.title}  ·  Página {documento.page}',
    )
    lienzo.setStrokeColor(LINEA)
    lienzo.setLineWidth(0.4)
    lienzo.line(18 * mm, 16 * mm, A4[0] - 18 * mm, 16 * mm)
    lienzo.restoreState()


def _encabezado(negocio: dict, titulo: str, subtitulo: str) -> Table:
    """Franja superior: datos del negocio a la izquierda, documento a la derecha."""
    izquierda = [
        Paragraph(negocio['nombre'], ESTILOS['marca']),
        Paragraph(
            f"NIT {negocio['nit']}<br/>{negocio['direccion']}<br/>{negocio['ciudad']}"
            f"<br/>{negocio['telefono']}  ·  {negocio['email']}",
            ESTILOS['gris'],
        ),
    ]
    derecha = [
        Paragraph(titulo, ESTILOS['titulo']),
        Paragraph(subtitulo, ESTILOS['gris_derecha']),
    ]

    tabla = Table([[izquierda, derecha]], colWidths=[95 * mm, 79 * mm])
    tabla.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('LINEBELOW', (0, 0), (-1, -1), 1.2, NARANJA),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    return tabla


def _estilo_tabla(filas: int, columnas_derecha: tuple[int, ...]) -> TableStyle:
    """Cabecera oscura, filas alternas y numeros alineados a la derecha."""
    ordenes = [
        ('BACKGROUND', (0, 0), (-1, 0), TINTA),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7.6),
        ('FONTSIZE', (0, 1), (-1, -1), 7.6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.3, LINEA),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, GRIS_SUAVE]),
    ]
    for columna in columnas_derecha:
        ordenes.append(('ALIGN', (columna, 0), (columna, -1), 'RIGHT'))
    return TableStyle(ordenes)


def _bloque_totales(lineas: list[tuple[str, str, bool]]) -> Table:
    """Recuadro de totales alineado a la derecha; la ultima fila va resaltada.

    La fila resaltada lleva su propio estilo de parrafo en blanco: el color que
    se le ponga a la celda con TEXTCOLOR no llega a un Paragraph, que pinta su
    texto con el color de su estilo.
    """
    filas = [
        [Paragraph(etiqueta, ESTILOS['total_etiqueta' if destacada else 'gris']),
         Paragraph(valor, ESTILOS['total_valor' if destacada else 'normal'])]
        for etiqueta, valor, destacada in lineas
    ]

    tabla = Table(filas, colWidths=[42 * mm, 34 * mm], hAlign='RIGHT')
    ordenes = [
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LINEABOVE', (0, 0), (-1, 0), 0.4, LINEA),
    ]
    for indice, (_, _, destacada) in enumerate(lineas):
        if destacada:
            ordenes += [
                ('BACKGROUND', (0, indice), (-1, indice), NARANJA),
                ('TOPPADDING', (0, indice), (-1, indice), 7),
                ('BOTTOMPADDING', (0, indice), (-1, indice), 7),
            ]
    tabla.setStyle(TableStyle(ordenes))
    return tabla


def _documento(buffer: BytesIO, titulo: str) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=22 * mm,
        title=titulo, author='MotosHub', subject=titulo,
    )


def reporte_diario(reporte: dict) -> bytes:
    """Reporte diario de ventas en PDF."""
    dia = reporte['fecha']
    resumen = reporte['resumen']
    titulo = f'Reporte de ventas {dia.isoformat()}'

    buffer = BytesIO()
    documento = _documento(buffer, titulo)

    historia = [
        _encabezado(
            reporte['negocio'],
            'Reporte diario de ventas',
            f"{fecha_larga(dia)}<br/>Generado el "
            f"{reporte['generado'].strftime('%d/%m/%Y a las %H:%M')}",
        ),
        Spacer(1, 9 * mm),
    ]

    encabezados = ['#', 'Venta', 'Fecha', 'Cliente', 'Productos y servicios',
                   'Cant.', 'Pago', 'Estado', 'Total']
    filas = [encabezados]

    for posicion, venta in enumerate(reporte['ventas'], start=1):
        filas.append([
            str(posicion),
            venta.numero_venta,
            venta.fecha_venta.strftime('%H:%M'),
            Paragraph(venta.cliente_nombre, ESTILOS['celda']),
            Paragraph(descripcion_items(venta), ESTILOS['celda']),
            str(venta.cantidad_items),
            ETIQUETAS_PAGO.get(venta.metodo_pago, venta.metodo_pago),
            ETIQUETAS_ESTADO.get(venta.estado, venta.estado),
            pesos(venta.total),
        ])

    if len(filas) == 1:
        filas.append([Paragraph(
            'No se registraron ventas en esta fecha.', ESTILOS['celda'],
        ), '', '', '', '', '', '', '', ''])

    tabla = Table(
        filas,
        colWidths=[7 * mm, 23 * mm, 12 * mm, 32 * mm, 47 * mm, 11 * mm, 20 * mm, 17 * mm, 25 * mm],
        repeatRows=1,
    )
    tabla.setStyle(_estilo_tabla(len(filas), columnas_derecha=(5, 8)))
    if len(reporte['ventas']) == 0:
        tabla.setStyle(TableStyle([('SPAN', (0, 1), (-1, 1))]))

    historia += [tabla, Spacer(1, 7 * mm)]

    historia.append(_bloque_totales([
        ('Ventas registradas', str(resumen['cantidad']), False),
        ('Anuladas', str(resumen['anuladas']), False),
        ('Unidades vendidas', str(resumen['unidades']), False),
        ('Subtotal', pesos(resumen['subtotal']), False),
        ('Descuentos', f"- {pesos(resumen['descuento'])}", False),
        ('IVA', pesos(resumen['impuestos']), False),
        ('Total del día', pesos(resumen['total']), True),
    ]))

    historia += [
        Spacer(1, 8 * mm),
        Paragraph(
            'Documento generado automáticamente por el sistema MotosHub. '
            'Las ventas anuladas aparecen en el listado pero no suman al total del día.',
            ESTILOS['pie'],
        ),
    ]

    documento.build(historia, onFirstPage=_pie_de_pagina, onLaterPages=_pie_de_pagina)
    return buffer.getvalue()


def factura(factura_bd, negocio: dict) -> bytes:
    """Factura de venta en PDF, lista para entregar o adjuntar al cliente."""
    titulo = f'Factura {factura_bd.numero_factura}'
    venta = factura_bd.venta

    buffer = BytesIO()
    documento = _documento(buffer, titulo)

    historia = [
        _encabezado(
            negocio,
            f'Factura de venta<br/><font size=11 color="#ff5c1a">{factura_bd.numero_factura}</font>',
            f"Emitida el {factura_bd.fecha_emision.strftime('%d/%m/%Y a las %H:%M')}<br/>"
            f"Estado: {factura_bd.estado.capitalize()}",
        ),
        Spacer(1, 7 * mm),
    ]

    # --- Datos del cliente y de la operacion ------------------------------
    cliente = Paragraph(
        f"<b>Cliente</b><br/>{factura_bd.cliente_nombre}<br/>"
        f"Documento: {factura_bd.cliente_documento}<br/>"
        f"{factura_bd.cliente_email}<br/>"
        f"{factura_bd.cliente_telefono or ''}<br/>"
        f"{factura_bd.cliente_direccion or ''}",
        ESTILOS['normal'],
    )
    operacion = Paragraph(
        f"<b>Venta</b><br/>Número: {venta.numero_venta if venta else '-'}<br/>"
        f"Fecha: {venta.fecha_venta.strftime('%d/%m/%Y %H:%M') if venta else '-'}<br/>"
        f"Forma de pago: {ETIQUETAS_PAGO.get(venta.metodo_pago, '-') if venta else '-'}<br/>"
        f"Atendido por: {(venta.vendedor_nombre if venta else None) or 'Compra en línea'}",
        ESTILOS['normal'],
    )

    marco = Table([[cliente, operacion]], colWidths=[87 * mm, 87 * mm])
    marco.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), GRIS_SUAVE),
        ('BOX', (0, 0), (-1, -1), 0.3, LINEA),
        ('INNERGRID', (0, 0), (-1, -1), 0.3, LINEA),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
    ]))
    historia += [marco, Spacer(1, 7 * mm)]

    # --- Detalle -----------------------------------------------------------
    filas = [['#', 'Descripción', 'Tipo', 'Cant.', 'Precio unitario', 'Descuento', 'Subtotal']]
    # Las lineas salen de la factura, que las congelo al emitirse.
    detalles = list(factura_bd.detalles)

    for posicion, detalle in enumerate(detalles, start=1):
        filas.append([
            str(posicion),
            Paragraph(detalle.nombre_item, ESTILOS['celda']),
            detalle.tipo_item.capitalize(),
            str(detalle.cantidad),
            pesos(detalle.precio_unitario),
            pesos(detalle.descuento),
            pesos(detalle.subtotal),
        ])

    tabla = Table(
        filas,
        colWidths=[8 * mm, 57 * mm, 18 * mm, 13 * mm, 27 * mm, 22 * mm, 29 * mm],
        repeatRows=1,
    )
    tabla.setStyle(_estilo_tabla(len(filas), columnas_derecha=(3, 4, 5, 6)))
    historia += [tabla, Spacer(1, 7 * mm)]

    historia.append(_bloque_totales([
        ('Subtotal', pesos(factura_bd.subtotal), False),
        ('Descuentos', f'- {pesos(factura_bd.descuento)}', False),
        (f'IVA ({int(factura_bd.porcentaje_iva)}%)', pesos(factura_bd.impuestos), False),
        ('Total a pagar', pesos(factura_bd.total), True),
    ]))

    if factura_bd.observaciones:
        historia += [
            Spacer(1, 6 * mm),
            Paragraph(f'<b>Observaciones:</b> {factura_bd.observaciones}', ESTILOS['gris']),
        ]

    historia += [
        Spacer(1, 10 * mm),
        Paragraph(
            'Gracias por su compra. Esta factura fue generada electrónicamente por el '
            'sistema MotosHub y es válida sin firma autógrafa.',
            ESTILOS['pie'],
        ),
    ]

    documento.build(historia, onFirstPage=_pie_de_pagina, onLaterPages=_pie_de_pagina)
    return buffer.getvalue()
