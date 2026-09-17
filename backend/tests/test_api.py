"""Pruebas automáticas de la API del cuarto avance.

Cubren los mismos casos que se piden evidenciar con Postman: registro, login,
JWT, CRUD de usuarios/productos/servicios, protección de endpoints y control
de roles, con respuestas correctas y de error.

Ejecutar con:  pytest -v
"""

from app.core.seguridad import decodificar_token
from app.crud import usuarios as crud_usuarios
from tests.conftest import CLIENTE, cabecera

NUEVO_CLIENTE = {
    'nombres': 'Tomas',
    'apellidos': 'Cardona',
    'tipo_documento': 'CC',
    'numero_documento': '1035123456',
    'direccion': 'Calle 10 #45-20',
    'telefono': '3001234567',
    'email': 'tomas@correo.com',
    'password': 'Clave123',
}


# ===========================================================================
# 9. Registro de clientes
# ===========================================================================
def test_registro_crea_el_cliente_y_guarda_la_contrasena_hasheada(cliente_http, sesion_de_prueba):
    respuesta = cliente_http.post('/api/auth/register', json=NUEVO_CLIENTE)

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo['ok'] is True
    assert cuerpo['usuario']['email'] == 'tomas@correo.com'
    assert cuerpo['usuario']['rol_id'] == 3  # se registra siempre como Cliente

    # La contraseña original nunca se almacena en texto plano.
    guardado = crud_usuarios.obtener_por_email(sesion_de_prueba, 'tomas@correo.com')
    assert guardado.password != NUEVO_CLIENTE['password']
    assert guardado.password.startswith('$2b$')


def test_la_ruta_alterna_de_registro_tambien_funciona(cliente_http):
    """POST /api/usuarios/registro, la ruta indicada en la guía del avance."""
    respuesta = cliente_http.post('/api/usuarios/registro', json=NUEVO_CLIENTE)
    assert respuesta.status_code == 201
    assert respuesta.json()['ok'] is True


def test_no_permite_correo_duplicado(cliente_http):
    cliente_http.post('/api/auth/register', json=NUEVO_CLIENTE)
    repetido = {**NUEVO_CLIENTE, 'numero_documento': '9999999999'}

    respuesta = cliente_http.post('/api/auth/register', json=repetido)

    assert respuesta.status_code == 409
    assert 'email' in respuesta.json()['errors']


def test_no_permite_documento_duplicado(cliente_http):
    cliente_http.post('/api/auth/register', json=NUEVO_CLIENTE)
    repetido = {**NUEVO_CLIENTE, 'email': 'otro@correo.com'}

    respuesta = cliente_http.post('/api/auth/register', json=repetido)

    assert respuesta.status_code == 409
    assert 'numero_documento' in respuesta.json()['errors']


# ===========================================================================
# 21. Validaciones del Backend (obligatorias aunque React ya haya validado)
# ===========================================================================
def test_rechaza_correo_con_formato_invalido(cliente_http):
    respuesta = cliente_http.post('/api/auth/register', json={**NUEVO_CLIENTE, 'email': 'correo-malo'})

    assert respuesta.status_code == 422
    assert 'email' in respuesta.json()['errors']


def test_rechaza_contrasena_debil(cliente_http):
    """Debe tener entre 8 y 20 caracteres con mayúscula, minúscula y número."""
    respuesta = cliente_http.post('/api/auth/register', json={**NUEVO_CLIENTE, 'password': 'clave'})

    assert respuesta.status_code == 422
    assert 'password' in respuesta.json()['errors']


def test_rechaza_telefono_con_letras(cliente_http):
    respuesta = cliente_http.post('/api/auth/register', json={**NUEVO_CLIENTE, 'telefono': 'ABC1234'})

    assert respuesta.status_code == 422
    assert 'telefono' in respuesta.json()['errors']


def test_rechaza_documento_demasiado_corto(cliente_http):
    respuesta = cliente_http.post('/api/auth/register', json={**NUEVO_CLIENTE, 'numero_documento': '123'})

    assert respuesta.status_code == 422
    assert 'numero_documento' in respuesta.json()['errors']


def test_rechaza_nombres_con_numeros(cliente_http):
    respuesta = cliente_http.post('/api/auth/register', json={**NUEVO_CLIENTE, 'nombres': 'Tomas123'})

    assert respuesta.status_code == 422
    assert 'nombres' in respuesta.json()['errors']


# ===========================================================================
# 10 y 11. Inicio de sesión y autenticación mediante JWT
# ===========================================================================
def test_login_correcto_devuelve_token_con_los_datos_del_usuario(cliente_http):
    respuesta = cliente_http.post('/api/auth/login', json=CLIENTE)

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo['ok'] is True
    assert cuerpo['usuario']['nombre_rol'] == 'Cliente'
    assert 'password' not in cuerpo['usuario']  # nunca se expone la contraseña

    contenido = decodificar_token(cuerpo['token'])
    assert contenido['email'] == CLIENTE['email']
    assert contenido['rol_nombre'] == 'Cliente'
    assert 'exp' in contenido  # el token expira


def test_login_con_contrasena_incorrecta(cliente_http):
    respuesta = cliente_http.post('/api/auth/login', json={**CLIENTE, 'password': 'NoEsLaClave1'})

    assert respuesta.status_code == 401
    assert respuesta.json()['codigo'] == 'credenciales_invalidas'


def test_login_con_correo_inexistente(cliente_http):
    respuesta = cliente_http.post('/api/auth/login', json={'email': 'nadie@correo.com', 'password': 'Clave123'})

    assert respuesta.status_code == 401


def test_un_usuario_inactivo_no_puede_iniciar_sesion(cliente_http, token_admin, sesion_de_prueba):
    usuario = crud_usuarios.obtener_por_email(sesion_de_prueba, CLIENTE['email'])
    cliente_http.patch(
        f'/api/usuarios/{usuario.id_usuario}/estado',
        json={'estado': 'inactivo'},
        headers=cabecera(token_admin),
    )

    respuesta = cliente_http.post('/api/auth/login', json=CLIENTE)

    assert respuesta.status_code == 403
    assert respuesta.json()['codigo'] == 'cuenta_inactiva'


# ===========================================================================
# 13. Protección de endpoints
# ===========================================================================
def test_sin_token_no_se_puede_listar_usuarios(cliente_http):
    respuesta = cliente_http.get('/api/usuarios')

    assert respuesta.status_code == 401
    assert respuesta.json()['codigo'] == 'no_autenticado'


def test_con_token_falso_se_rechaza_la_peticion(cliente_http):
    respuesta = cliente_http.get('/api/usuarios', headers=cabecera('token.inventado.123'))

    assert respuesta.status_code == 403
    assert respuesta.json()['codigo'] == 'token_invalido'


# ===========================================================================
# 12. Control de roles
# ===========================================================================
def test_un_cliente_no_puede_listar_usuarios(cliente_http, token_cliente):
    respuesta = cliente_http.get('/api/usuarios', headers=cabecera(token_cliente))

    assert respuesta.status_code == 403
    assert respuesta.json()['codigo'] == 'sin_permisos'


def test_un_empleado_no_puede_listar_usuarios(cliente_http, token_empleado):
    respuesta = cliente_http.get('/api/usuarios', headers=cabecera(token_empleado))

    assert respuesta.status_code == 403


def test_el_administrador_si_puede_listar_usuarios(cliente_http, token_admin):
    respuesta = cliente_http.get('/api/usuarios', headers=cabecera(token_admin))

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert len(cuerpo['usuarios']) == 3
    assert all('password' not in usuario for usuario in cuerpo['usuarios'])


def test_un_cliente_puede_ver_su_propio_perfil_pero_no_el_de_otro(cliente_http, token_cliente, sesion_de_prueba):
    propio = crud_usuarios.obtener_por_email(sesion_de_prueba, CLIENTE['email'])
    ajeno = crud_usuarios.obtener_por_email(sesion_de_prueba, 'admin@jhmtech.com')

    propia = cliente_http.get(f'/api/usuarios/{propio.id_usuario}', headers=cabecera(token_cliente))
    ajena = cliente_http.get(f'/api/usuarios/{ajeno.id_usuario}', headers=cabecera(token_cliente))

    assert propia.status_code == 200
    assert propia.json()['usuario']['email'] == CLIENTE['email']
    assert ajena.status_code == 403


# ===========================================================================
# 16. CRUD de usuarios (métodos GET, POST, PUT, PATCH y DELETE)
# ===========================================================================
def test_el_administrador_crea_un_empleado(cliente_http, token_admin):
    nuevo = {**NUEVO_CLIENTE, 'rol_id': 2}

    respuesta = cliente_http.post('/api/usuarios', json=nuevo, headers=cabecera(token_admin))

    assert respuesta.status_code == 201
    id_creado = respuesta.json()['id_usuario']

    consulta = cliente_http.get(f'/api/usuarios/{id_creado}', headers=cabecera(token_admin))
    assert consulta.json()['usuario']['nombre_rol'] == 'Empleado'


def test_actualizar_un_usuario(cliente_http, token_admin, sesion_de_prueba):
    usuario = crud_usuarios.obtener_por_email(sesion_de_prueba, CLIENTE['email'])
    cambios = {
        'nombres': 'Carlos Andres', 'apellidos': 'Perez Ruiz',
        'direccion': 'Carrera 80 #20-15', 'telefono': '3009998877',
        'email': CLIENTE['email'], 'rol_id': 3,
    }

    respuesta = cliente_http.put(
        f'/api/usuarios/{usuario.id_usuario}', json=cambios, headers=cabecera(token_admin),
    )

    assert respuesta.status_code == 200
    consulta = cliente_http.get(f'/api/usuarios/{usuario.id_usuario}', headers=cabecera(token_admin))
    assert consulta.json()['usuario']['nombres'] == 'Carlos Andres'


def test_un_cliente_no_puede_cambiarse_el_rol_a_administrador(cliente_http, token_cliente, sesion_de_prueba):
    usuario = crud_usuarios.obtener_por_email(sesion_de_prueba, CLIENTE['email'])
    cambios = {
        'nombres': 'Carlos', 'apellidos': 'Perez', 'direccion': 'Carrera 45 #12-30',
        'telefono': '3004445566', 'email': CLIENTE['email'],
        'rol_id': 1,  # intenta ascenderse a Administrador
    }

    respuesta = cliente_http.put(
        f'/api/usuarios/{usuario.id_usuario}', json=cambios, headers=cabecera(token_cliente),
    )

    assert respuesta.status_code == 200
    sesion_de_prueba.refresh(usuario)
    assert usuario.rol_id == 3  # el Backend ignoró el cambio de rol


def test_cambiar_el_estado_de_un_usuario(cliente_http, token_admin, sesion_de_prueba):
    usuario = crud_usuarios.obtener_por_email(sesion_de_prueba, CLIENTE['email'])

    respuesta = cliente_http.patch(
        f'/api/usuarios/{usuario.id_usuario}/estado',
        json={'estado': 'inactivo'},
        headers=cabecera(token_admin),
    )

    assert respuesta.status_code == 200
    sesion_de_prueba.refresh(usuario)
    assert usuario.estado == 'inactivo'


def test_el_estado_solo_acepta_activo_o_inactivo(cliente_http, token_admin, sesion_de_prueba):
    usuario = crud_usuarios.obtener_por_email(sesion_de_prueba, CLIENTE['email'])

    respuesta = cliente_http.patch(
        f'/api/usuarios/{usuario.id_usuario}/estado',
        json={'estado': 'suspendido'},
        headers=cabecera(token_admin),
    )

    assert respuesta.status_code == 422


def test_eliminar_un_usuario(cliente_http, token_admin, sesion_de_prueba):
    usuario = crud_usuarios.obtener_por_email(sesion_de_prueba, CLIENTE['email'])

    respuesta = cliente_http.delete(f'/api/usuarios/{usuario.id_usuario}', headers=cabecera(token_admin))

    assert respuesta.status_code == 200
    assert crud_usuarios.obtener_por_email(sesion_de_prueba, CLIENTE['email']) is None


def test_consultar_un_usuario_inexistente(cliente_http, token_admin):
    respuesta = cliente_http.get('/api/usuarios/9999', headers=cabecera(token_admin))

    assert respuesta.status_code == 404
    assert respuesta.json()['codigo'] == 'recurso_no_encontrado'


# ===========================================================================
# CRUD de productos
# ===========================================================================
def test_el_catalogo_de_productos_es_publico(cliente_http):
    respuesta = cliente_http.get('/api/productos')

    assert respuesta.status_code == 200
    assert len(respuesta.json()['productos']) == 1


def test_crear_un_producto_exige_token(cliente_http):
    respuesta = cliente_http.post('/api/productos', json={'nombre': 'Guantes', 'precio': 120000})

    assert respuesta.status_code == 401


def test_un_cliente_no_puede_crear_productos(cliente_http, token_cliente):
    respuesta = cliente_http.post(
        '/api/productos', json={'nombre': 'Guantes', 'precio': 120000}, headers=cabecera(token_cliente),
    )

    assert respuesta.status_code == 403


def test_un_empleado_puede_crear_y_actualizar_productos(cliente_http, token_empleado):
    creacion = cliente_http.post(
        '/api/productos',
        json={'nombre': 'Guantes de Cuero', 'descripcion': 'Reforzados.',
              'precio': 120000, 'stock': 30, 'categoria': 'Accesorios', 'imagen': ''},
        headers=cabecera(token_empleado),
    )
    assert creacion.status_code == 201
    id_producto = creacion.json()['id_producto']

    actualizacion = cliente_http.put(
        f'/api/productos/{id_producto}',
        json={'nombre': 'Guantes de Cuero Racing', 'descripcion': 'Reforzados.',
              'precio': 135000, 'stock': 25, 'categoria': 'Accesorios',
              'imagen': '', 'estado': 'activo'},
        headers=cabecera(token_empleado),
    )
    assert actualizacion.status_code == 200

    consulta = cliente_http.get(f'/api/productos/{id_producto}')
    assert consulta.json()['producto']['nombre'] == 'Guantes de Cuero Racing'
    assert consulta.json()['producto']['imagen'] is None  # la cadena vacía se guarda como NULL


def test_solo_el_administrador_elimina_productos(cliente_http, token_empleado, token_admin):
    negado = cliente_http.delete('/api/productos/1', headers=cabecera(token_empleado))
    assert negado.status_code == 403

    permitido = cliente_http.delete('/api/productos/1', headers=cabecera(token_admin))
    assert permitido.status_code == 200
    assert cliente_http.get('/api/productos/1').status_code == 404


def test_rechaza_un_producto_con_precio_negativo(cliente_http, token_admin):
    respuesta = cliente_http.post(
        '/api/productos', json={'nombre': 'Moto', 'precio': -5}, headers=cabecera(token_admin),
    )

    assert respuesta.status_code == 422
    assert 'precio' in respuesta.json()['errors']


# ===========================================================================
# CRUD de servicios
# ===========================================================================
def test_el_catalogo_de_servicios_es_publico(cliente_http):
    respuesta = cliente_http.get('/api/servicios')

    assert respuesta.status_code == 200
    assert len(respuesta.json()['servicios']) == 1


def test_un_empleado_gestiona_servicios(cliente_http, token_empleado):
    creacion = cliente_http.post(
        '/api/servicios',
        json={'nombre': 'Diagnostico Electronico', 'descripcion': 'Escaneo de fallas.',
              'precio': 80000, 'duracion_minutos': 40},
        headers=cabecera(token_empleado),
    )
    assert creacion.status_code == 201
    id_servicio = creacion.json()['id_servicio']

    actualizacion = cliente_http.put(
        f'/api/servicios/{id_servicio}',
        json={'nombre': 'Diagnostico Electronico Avanzado', 'descripcion': 'Escaneo de fallas.',
              'precio': 95000, 'duracion_minutos': 50, 'estado': 'activo'},
        headers=cabecera(token_empleado),
    )
    assert actualizacion.status_code == 200

    consulta = cliente_http.get(f'/api/servicios/{id_servicio}')
    assert consulta.json()['servicio']['precio'] == '95000.00'


def test_un_servicio_guarda_y_devuelve_su_imagen(cliente_http, token_empleado):
    """Los servicios se muestran como los productos, con foto en el catálogo."""
    creacion = cliente_http.post(
        '/api/servicios',
        json={'nombre': 'Lavado Premium', 'descripcion': 'Lavado y encerado.',
              'precio': 45000, 'duracion_minutos': 40,
              'imagen': '/img/servicios/lavado-encerado.jpg'},
        headers=cabecera(token_empleado),
    )
    assert creacion.status_code == 201

    consulta = cliente_http.get(f"/api/servicios/{creacion.json()['id_servicio']}")
    assert consulta.json()['servicio']['imagen'] == '/img/servicios/lavado-encerado.jpg'


def test_una_imagen_vacia_se_guarda_como_nula(cliente_http, token_empleado):
    """El formulario de React envía '' cuando no se indica imagen."""
    creacion = cliente_http.post(
        '/api/servicios',
        json={'nombre': 'Revision Rapida', 'descripcion': 'Chequeo general.',
              'precio': 30000, 'duracion_minutos': 20, 'imagen': ''},
        headers=cabecera(token_empleado),
    )
    assert creacion.status_code == 201

    consulta = cliente_http.get(f"/api/servicios/{creacion.json()['id_servicio']}")
    assert consulta.json()['servicio']['imagen'] is None


def test_el_catalogo_publico_entrega_la_imagen_de_cada_servicio(cliente_http):
    respuesta = cliente_http.get('/api/servicios')

    assert respuesta.status_code == 200
    assert 'imagen' in respuesta.json()['servicios'][0]


def test_solo_el_administrador_elimina_servicios(cliente_http, token_empleado, token_admin):
    assert cliente_http.delete('/api/servicios/1', headers=cabecera(token_empleado)).status_code == 403
    assert cliente_http.delete('/api/servicios/1', headers=cabecera(token_admin)).status_code == 200


# ===========================================================================
# 25. Documentación automática y respuestas del sistema
# ===========================================================================
def test_la_documentacion_de_swagger_esta_disponible(cliente_http):
    assert cliente_http.get('/docs').status_code == 200
    esquema = cliente_http.get('/openapi.json').json()
    assert '/api/auth/login' in esquema['paths']
    assert '/api/usuarios/{id_usuario}/estado' in esquema['paths']


def test_una_ruta_inexistente_devuelve_el_formato_de_error_de_la_api(cliente_http):
    respuesta = cliente_http.get('/api/no-existe')

    assert respuesta.status_code == 404
    assert respuesta.json()['ok'] is False
    assert respuesta.json()['message'] == 'Ruta no encontrada'
