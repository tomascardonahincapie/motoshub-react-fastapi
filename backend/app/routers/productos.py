"""CRUD de productos. La consulta es pública; la gestión exige rol."""

from typing import Annotated

from fastapi import APIRouter, Path, status

from app.crud import productos as crud_productos
from app.dependencias import Administrador, AdministradorOEmpleado, Sesion
from app.errores import RecursoNoEncontrado
from app.schemas.comunes import DetalleDeError, RespuestaOk
from app.schemas.producto import (
    ProductoActualizar,
    ProductoCrear,
    RespuestaListaProductos,
    RespuestaProducto,
    RespuestaProductoCreado,
)

router = APIRouter(
    prefix='/api/productos',
    tags=['Productos'],
    responses={404: {'model': DetalleDeError}},
)

IdProducto = Annotated[int, Path(ge=1, description='Identificador del producto.')]

RESPUESTAS_PROTEGIDAS = {
    401: {'model': DetalleDeError, 'description': 'Falta el token'},
    403: {'model': DetalleDeError, 'description': 'Token inválido o rol sin permisos'},
}


def buscar_o_fallar(sesion: Sesion, id_producto: int):
    producto = crud_productos.obtener(sesion, id_producto)
    if producto is None:
        raise RecursoNoEncontrado('Producto')
    return producto


@router.get(
    '',
    response_model=RespuestaListaProductos,
    summary='Listar el catálogo de productos',
    description='Consulta pública: cualquier visitante puede ver el catálogo.',
)
def listar_productos(sesion: Sesion):
    return {'ok': True, 'productos': crud_productos.listar(sesion)}


@router.get(
    '/{id_producto}',
    response_model=RespuestaProducto,
    summary='Consultar un producto',
    description='Consulta pública.',
)
def obtener_producto(id_producto: IdProducto, sesion: Sesion):
    return {'ok': True, 'producto': buscar_o_fallar(sesion, id_producto)}


@router.post(
    '',
    response_model=RespuestaProductoCreado,
    status_code=status.HTTP_201_CREATED,
    summary='Crear un producto',
    description='Requiere rol Administrador o Empleado.',
    responses=RESPUESTAS_PROTEGIDAS,
)
def crear_producto(datos: ProductoCrear, sesion: Sesion, gestor: AdministradorOEmpleado):
    producto = crud_productos.crear(sesion, datos.model_dump())
    return {'ok': True, 'message': 'Producto creado correctamente', 'id_producto': producto.id_producto}


@router.put(
    '/{id_producto}',
    response_model=RespuestaOk,
    summary='Actualizar un producto',
    description='Requiere rol Administrador o Empleado.',
    responses=RESPUESTAS_PROTEGIDAS,
)
def actualizar_producto(
    id_producto: IdProducto,
    datos: ProductoActualizar,
    sesion: Sesion,
    gestor: AdministradorOEmpleado,
):
    producto = buscar_o_fallar(sesion, id_producto)
    crud_productos.actualizar(sesion, producto, datos.model_dump())
    return {'ok': True, 'message': 'Producto actualizado correctamente'}


@router.delete(
    '/{id_producto}',
    response_model=RespuestaOk,
    summary='Eliminar un producto',
    description='Reservado al Administrador.',
    responses=RESPUESTAS_PROTEGIDAS,
)
def eliminar_producto(id_producto: IdProducto, sesion: Sesion, administrador: Administrador):
    producto = buscar_o_fallar(sesion, id_producto)
    crud_productos.eliminar(sesion, producto)
    return {'ok': True, 'message': 'Producto eliminado correctamente'}
