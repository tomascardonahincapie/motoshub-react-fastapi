"""Configuración de las pruebas automáticas.

Las pruebas usan una base de datos SQLite en memoria para no depender de que
MySQL esté encendido: así se puede comprobar toda la API con un solo comando.
La aplicación real sigue conectándose a MySQL mediante el archivo .env.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.core.base_datos import Base, crear_motor, obtener_sesion
from app.core.seguridad import generar_hash
from app.main import app
from app.models import Producto, Rol, Servicio, Usuario

ADMIN = {'email': 'admin@jhmtech.com', 'password': 'Admin1234'}
EMPLEADO = {'email': 'empleado@jhmtech.com', 'password': 'Empleado123'}
CLIENTE = {'email': 'cliente@jhmtech.com', 'password': 'Cliente123'}


def sembrar(sesion):
    """Carga los roles y un usuario de cada rol, igual que database/schema.sql."""
    sesion.add_all([
        Rol(id_rol=1, nombre_rol='Administrador'),
        Rol(id_rol=2, nombre_rol='Empleado'),
        Rol(id_rol=3, nombre_rol='Cliente'),
    ])
    sesion.flush()

    base = {
        'tipo_documento': 'CC', 'direccion': 'Oficina Principal',
        'telefono': '3000000000', 'estado': 'activo',
    }
    sesion.add_all([
        Usuario(nombres='Admin', apellidos='JHM Tech', numero_documento='1000000000',
                email=ADMIN['email'], password=generar_hash(ADMIN['password']),
                rol_id=1, **base),
        Usuario(nombres='Laura', apellidos='Gomez', numero_documento='1000000001',
                email=EMPLEADO['email'], password=generar_hash(EMPLEADO['password']),
                rol_id=2, **base),
        Usuario(nombres='Carlos', apellidos='Perez', numero_documento='1000000002',
                email=CLIENTE['email'], password=generar_hash(CLIENTE['password']),
                rol_id=3, **base),
    ])
    # En productos solo hay motos: los accesorios no son parte del negocio.
    sesion.add(Producto(nombre='Kawasaki Ninja 400', descripcion='Deportiva de 399cc.',
                        precio=480000, stock=20, categoria='Deportivas'))
    sesion.add(Servicio(nombre='Cambio de Aceite', descripcion='Aceite mas filtro.',
                        precio=70000, duracion_minutos=30,
                        imagen='/img/servicios/cambio-aceite.jpg'))
    sesion.commit()


@pytest.fixture(autouse=True)
def limitador_limpio():
    """El limitador cuenta en memoria del proceso.

    Sin vaciarlo entre pruebas, las de recuperacion de contrasena se estorban
    entre si y fallan segun el orden en que corran.
    """
    from app.core import limitador

    limitador.reiniciar()
    yield
    limitador.reiniciar()


@pytest.fixture()
def sesion_de_prueba():
    motor = crear_motor('sqlite://')
    Base.metadata.create_all(motor)
    Sesion = sessionmaker(bind=motor, autoflush=False, autocommit=False, future=True)

    sesion = Sesion()
    sembrar(sesion)
    try:
        yield sesion
    finally:
        sesion.close()
        Base.metadata.drop_all(motor)
        motor.dispose()


@pytest.fixture()
def cliente_http(sesion_de_prueba):
    """TestClient con la base de datos de pruebas inyectada."""
    def sesion_de_la_api():
        yield sesion_de_prueba

    app.dependency_overrides[obtener_sesion] = sesion_de_la_api
    with TestClient(app) as cliente:
        yield cliente
    app.dependency_overrides.clear()


def iniciar_sesion(cliente_http, credenciales: dict) -> str:
    """Devuelve el token JWT de las credenciales indicadas."""
    respuesta = cliente_http.post('/api/auth/login', json=credenciales)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()['token']


def cabecera(token: str) -> dict:
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture()
def token_admin(cliente_http):
    return iniciar_sesion(cliente_http, ADMIN)


@pytest.fixture()
def token_empleado(cliente_http):
    return iniciar_sesion(cliente_http, EMPLEADO)


@pytest.fixture()
def token_cliente(cliente_http):
    return iniciar_sesion(cliente_http, CLIENTE)
