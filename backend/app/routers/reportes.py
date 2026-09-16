"""Reporte diario de ventas en tres formatos: JSON, PDF y Excel.

Los tres salen exactamente de los mismos datos, calculados una sola vez en
`servicios.reportes.datos_reporte`. Si el reporte en pantalla y el PDF
difirieran en un peso, seria porque alguien duplico el calculo.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.dependencias import AdministradorOEmpleado, Sesion
from app.schemas.comunes import DetalleDeError
from app.schemas.reporte import RespuestaReporteDiario
from app.servicios import excel as servicio_excel
from app.servicios import pdf as servicio_pdf
from app.servicios import reportes as servicio_reportes

router = APIRouter(
    prefix='/api/reportes',
    tags=['Reportes'],
    responses={
        401: {'model': DetalleDeError, 'description': 'Falta el token'},
        403: {'model': DetalleDeError, 'description': 'Token inválido o rol sin permisos'},
    },
)

TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

Fecha = Annotated[
    date | None,
    Query(description='Fecha del reporte en formato AAAA-MM-DD. Por omisión, hoy.'),
]


def _descarga(contenido: bytes, nombre: str, tipo: str) -> Response:
    return Response(
        content=contenido,
        media_type=tipo,
        headers={
            'Content-Disposition': f'attachment; filename="{nombre}"',
            # Sin esto el navegador no puede leer el nombre del archivo.
            'Access-Control-Expose-Headers': 'Content-Disposition',
        },
    )


@router.get(
    '/ventas-diarias',
    response_model=RespuestaReporteDiario,
    summary='Reporte diario de ventas',
    description=(
        'Ventas registradas en una fecha con sus totales. Reservado a '
        'Administrador y Empleado.'
    ),
)
def reporte_diario(sesion: Sesion, gestor: AdministradorOEmpleado, fecha: Fecha = None):
    datos = servicio_reportes.datos_reporte(sesion, fecha or date.today())
    return {'ok': True, **datos}


@router.get(
    '/ventas-diarias/pdf',
    summary='Descargar el reporte diario en PDF',
    response_class=Response,
    responses={200: {'content': {'application/pdf': {}}, 'description': 'Reporte en PDF'}},
)
def reporte_diario_pdf(sesion: Sesion, gestor: AdministradorOEmpleado, fecha: Fecha = None):
    dia = fecha or date.today()
    datos = servicio_reportes.datos_reporte(sesion, dia)
    return _descarga(
        servicio_pdf.reporte_diario(datos),
        servicio_reportes.nombre_archivo(dia, 'pdf'),
        'application/pdf',
    )


@router.get(
    '/ventas-diarias/excel',
    summary='Descargar el reporte diario en Excel',
    response_class=Response,
    responses={200: {'content': {TIPO_EXCEL: {}}, 'description': 'Reporte en .xlsx'}},
)
def reporte_diario_excel(sesion: Sesion, gestor: AdministradorOEmpleado, fecha: Fecha = None):
    dia = fecha or date.today()
    datos = servicio_reportes.datos_reporte(sesion, dia)
    return _descarga(
        servicio_excel.reporte_diario(datos),
        servicio_reportes.nombre_archivo(dia, 'xlsx'),
        TIPO_EXCEL,
    )
