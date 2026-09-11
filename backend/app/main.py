"""Punto de entrada de la API.

Arquitectura: React + Vite  ->  FastAPI  ->  Base de datos SQL (MySQL).

Aquí se registran los middlewares, CORS, los routers y los manejadores de
errores que dan a toda la API un único formato de respuesta.
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.base_datos import motor
from app.core.configuracion import configuracion
from app.errores import ErrorDeDominio
from app.middlewares import cabeceras_de_seguridad, registrar_peticion
from app.routers import auth, productos, servicios, usuarios

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s | %(message)s')
logger = logging.getLogger('motoshub')

TAGS = [
    {'name': 'Autenticacion', 'description': 'Registro de clientes e inicio de sesión con JWT.'},
    {'name': 'Usuarios', 'description': 'Gestión de usuarios, roles y estados (CRUD completo).'},
    {'name': 'Productos', 'description': 'Catálogo de productos de la tienda.'},
    {'name': 'Servicios', 'description': 'Servicios de taller ofrecidos por el negocio.'},
    {'name': 'Sistema', 'description': 'Estado del servicio y comprobación de la base de datos.'},
]

DESCRIPCION = """
API REST del proyecto **MotosHub**, cuarto avance de la competencia React.

* **Frontend:** React + Vite + Tailwind CSS
* **Backend:** FastAPI (Python)
* **Base de datos:** MySQL

La autenticación se realiza mediante **JSON Web Token**. Para probar los
endpoints protegidos desde esta misma página:

1. Ejecuta POST /api/auth/login con un usuario válido.
2. Copia el valor de "token" de la respuesta.
3. Pulsa el botón **Authorize** (arriba a la derecha) y pega el token.
"""

app = FastAPI(
    title=configuracion.nombre_app,
    description=DESCRIPCION,
    version='1.0.0',
    openapi_tags=TAGS,
)

app.middleware('http')(cabeceras_de_seguridad)
app.middleware('http')(registrar_peticion)

# Permite que el Frontend de Vite (que corre en otro puerto) consuma esta API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=configuracion.origenes_permitidos,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
    expose_headers=['X-Peticion-Id', 'X-Tiempo-Respuesta-ms'],
    max_age=600,
)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(productos.router)
app.include_router(servicios.router)


# ---------------------------------------------------------------------------
# Manejadores de error: toda la API responde con el mismo formato JSON.
# ---------------------------------------------------------------------------
def respuesta_error(estado: int, mensaje: str, codigo: str, errores: dict | None = None) -> JSONResponse:
    contenido = {'ok': False, 'message': mensaje, 'codigo': codigo}
    if errores:
        contenido['errors'] = errores
    return JSONResponse(status_code=estado, content=contenido)


@app.exception_handler(ErrorDeDominio)
def manejar_error_de_dominio(peticion: Request, exc: ErrorDeDominio):
    """Cubre los 400, 401, 403, 404 y 409 de las reglas de negocio."""
    return respuesta_error(exc.estado, exc.mensaje, exc.codigo, exc.errores)


@app.exception_handler(RequestValidationError)
def manejar_validacion(peticion: Request, exc: RequestValidationError):
    """Traduce los errores de Pydantic a mensajes por campo para React."""
    errores: dict[str, str] = {}
    for error in exc.errors():
        # loc viene como ('body', 'email'): nos quedamos con el nombre del campo.
        partes = [str(parte) for parte in error['loc'][1:]]
        campo = '.'.join(partes) if partes else 'general'
        errores.setdefault(campo, error['msg'].replace('Value error, ', ''))

    resumen = ', '.join(f'{campo}: {texto}' for campo, texto in errores.items())
    return respuesta_error(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        f'Los datos enviados no son válidos ({resumen})',
        'datos_invalidos',
        errores,
    )


@app.exception_handler(IntegrityError)
def manejar_integridad(peticion: Request, exc: IntegrityError):
    """Red de seguridad ante correos o documentos duplicados (condición de carrera)."""
    logger.warning('Violación de integridad en %s: %s', peticion.url.path, exc.orig)
    return respuesta_error(
        status.HTTP_409_CONFLICT,
        'El correo o el número de documento ya están registrados',
        'registro_duplicado',
    )


@app.exception_handler(SQLAlchemyError)
def manejar_error_de_base_datos(peticion: Request, exc: SQLAlchemyError):
    logger.exception('Error de base de datos en %s', peticion.url.path)
    return respuesta_error(
        status.HTTP_503_SERVICE_UNAVAILABLE,
        'No fue posible conectar con la base de datos. Verifica que MySQL esté en ejecución.',
        'base_datos_no_disponible',
    )


@app.exception_handler(StarletteHTTPException)
def manejar_http(peticion: Request, exc: StarletteHTTPException):
    mensaje = 'Ruta no encontrada' if exc.status_code == 404 else str(exc.detail)
    return respuesta_error(exc.status_code, mensaje, f'http_{exc.status_code}')


@app.exception_handler(Exception)
def manejar_error_inesperado(peticion: Request, exc: Exception):
    logger.exception('Error no controlado en %s', peticion.url.path)
    return respuesta_error(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
        'error_interno',
    )


# ---------------------------------------------------------------------------
# Endpoints del sistema
# ---------------------------------------------------------------------------
@app.get('/', tags=['Sistema'], summary='Información del servicio')
def raiz():
    return {
        'ok': True,
        'servicio': configuracion.nombre_app,
        'version': app.version,
        'entorno': configuracion.entorno,
        'documentacion': '/docs',
    }


@app.get('/salud', tags=['Sistema'], summary='Estado del servicio y de la base de datos')
def estado_del_servicio():
    """Comprueba que la conexión con la base de datos responda."""
    try:
        with motor.connect() as conexion:
            conexion.execute(text('SELECT 1'))
        base_datos = 'conectada'
    except SQLAlchemyError as error:
        logger.error('La base de datos no responde: %s', error)
        base_datos = 'sin conexión'

    return {'ok': base_datos == 'conectada', 'estado': 'ok', 'base_datos': base_datos}
