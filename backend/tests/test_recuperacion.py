"""Pruebas del flujo de recuperación de contraseña (REQ-15).

Cubren la solicitud del enlace, su vigencia, el uso único, el cambio efectivo
de la contraseña y el hecho de que no se revele qué correos están registrados.

Ejecutar con:  pytest tests/test_recuperacion.py -v
"""

from datetime import datetime, timedelta

from app.crud import usuarios as crud_usuarios
from app.models import TokenRecuperacion
from tests.conftest import CLIENTE, cabecera

TOKEN_INVENTADO = 'x' * 43


def solicitar_enlace(cliente_http, email):
    """Pide el enlace y devuelve el token que viaja dentro de la URL."""
    respuesta = cliente_http.post('/api/auth/recuperar-password', json={'email': email})
    assert respuesta.status_code == 200
    enlace = respuesta.json()['enlace']
    return enlace.rsplit('/', 1)[1] if enlace else None


# ===========================================================================
# Solicitud del enlace
# ===========================================================================
def test_solicitar_recuperacion_genera_un_enlace(cliente_http):
    respuesta = cliente_http.post('/api/auth/recuperar-password', json={'email': CLIENTE['email']})

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo['ok'] is True
    # En modo desarrollo se devuelve el enlace para poder probar sin correo.
    assert '/restablecer/' in cuerpo['enlace']


def test_un_correo_inexistente_responde_igual(cliente_http):
    """No debe revelarse qué correos están registrados."""
    conocido = cliente_http.post('/api/auth/recuperar-password', json={'email': CLIENTE['email']})
    desconocido = cliente_http.post('/api/auth/recuperar-password', json={'email': 'nadie@correo.com'})

    assert conocido.status_code == desconocido.status_code == 200
    assert conocido.json()['message'] == desconocido.json()['message']
    assert desconocido.json()['enlace'] is None  # pero no se genera ningún token


def test_rechaza_un_correo_con_formato_invalido(cliente_http):
    respuesta = cliente_http.post('/api/auth/recuperar-password', json={'email': 'correo-malo'})

    assert respuesta.status_code == 422
    assert 'email' in respuesta.json()['errors']


def test_el_token_no_se_guarda_en_claro(cliente_http, sesion_de_prueba):
    """En la base de datos solo debe quedar el hash SHA-256 del token."""
    token = solicitar_enlace(cliente_http, CLIENTE['email'])
    registro = sesion_de_prueba.query(TokenRecuperacion).first()

    assert registro is not None
    assert registro.token_hash != token
    assert len(registro.token_hash) == 64
    assert registro.usado is False


def test_una_cuenta_inactiva_no_recibe_enlace(cliente_http, token_admin, sesion_de_prueba):
    usuario = crud_usuarios.obtener_por_email(sesion_de_prueba, CLIENTE['email'])
    cliente_http.patch(
        f'/api/usuarios/{usuario.id_usuario}/estado',
        json={'estado': 'inactivo'},
        headers=cabecera(token_admin),
    )

    respuesta = cliente_http.post('/api/auth/recuperar-password', json={'email': CLIENTE['email']})

    assert respuesta.status_code == 200        # mismo mensaje, para no revelar nada
    assert respuesta.json()['enlace'] is None  # pero sin enlace


# ===========================================================================
# Verificación del enlace
# ===========================================================================
def test_verificar_un_enlace_vigente(cliente_http):
    token = solicitar_enlace(cliente_http, CLIENTE['email'])

    respuesta = cliente_http.get(f'/api/auth/restablecer-password/{token}')

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo['nombres'] == 'Carlos'
    assert '*' in cuerpo['email']                      # el correo va enmascarado
    assert cuerpo['email'].endswith('@jhmtech.com')
    assert cuerpo['minutos_restantes'] > 0


def test_un_enlace_inventado_se_rechaza(cliente_http):
    respuesta = cliente_http.get(f'/api/auth/restablecer-password/{TOKEN_INVENTADO}')

    assert respuesta.status_code == 400
    assert respuesta.json()['codigo'] == 'token_recuperacion_invalido'


def test_pedir_un_enlace_nuevo_anula_el_anterior(cliente_http, sesion_de_prueba):
    """Pasada la espera entre envios, el enlace viejo deja de servir.

    Durante los primeros minutos el Backend reutiliza el enlace vigente en vez
    de mandar otro correo. Para comprobar que despues si se renueva, se
    envejece la solicitud a mano en lugar de esperar de verdad.
    """
    primero = solicitar_enlace(cliente_http, CLIENTE['email'])

    registro = sesion_de_prueba.query(TokenRecuperacion).first()
    registro.fecha_creacion = datetime.now() - timedelta(minutes=10)
    sesion_de_prueba.commit()

    segundo = solicitar_enlace(cliente_http, CLIENTE['email'])

    assert primero != segundo
    assert cliente_http.get(f'/api/auth/restablecer-password/{primero}').status_code == 400
    assert cliente_http.get(f'/api/auth/restablecer-password/{segundo}').status_code == 200


def test_un_enlace_expirado_no_sirve(cliente_http, sesion_de_prueba):
    token = solicitar_enlace(cliente_http, CLIENTE['email'])

    # Se envejece el token a mano para no esperar los 30 minutos reales.
    registro = sesion_de_prueba.query(TokenRecuperacion).first()
    registro.fecha_expiracion = datetime.now() - timedelta(minutes=1)
    sesion_de_prueba.commit()

    assert cliente_http.get(f'/api/auth/restablecer-password/{token}').status_code == 400

    reintento = cliente_http.post(
        '/api/auth/restablecer-password',
        json={'token': token, 'password': 'NuevaClave123'},
    )
    assert reintento.status_code == 400


# ===========================================================================
# Cambio efectivo de la contraseña
# ===========================================================================
def test_restablecer_la_contrasena_y_entrar_con_la_nueva(cliente_http):
    token = solicitar_enlace(cliente_http, CLIENTE['email'])

    cambio = cliente_http.post(
        '/api/auth/restablecer-password',
        json={'token': token, 'password': 'NuevaClave123'},
    )
    assert cambio.status_code == 200
    assert cambio.json()['ok'] is True

    # La contraseña anterior ya no sirve...
    assert cliente_http.post('/api/auth/login', json=CLIENTE).status_code == 401

    # ...y la nueva sí.
    nueva = cliente_http.post(
        '/api/auth/login',
        json={'email': CLIENTE['email'], 'password': 'NuevaClave123'},
    )
    assert nueva.status_code == 200
    assert nueva.json()['usuario']['nombre_rol'] == 'Cliente'


def test_la_nueva_contrasena_queda_hasheada(cliente_http, sesion_de_prueba):
    token = solicitar_enlace(cliente_http, CLIENTE['email'])
    cliente_http.post(
        '/api/auth/restablecer-password',
        json={'token': token, 'password': 'NuevaClave123'},
    )

    usuario = crud_usuarios.obtener_por_email(sesion_de_prueba, CLIENTE['email'])
    assert usuario.password != 'NuevaClave123'
    assert usuario.password.startswith('$2b$')


def test_el_enlace_sirve_una_sola_vez(cliente_http):
    token = solicitar_enlace(cliente_http, CLIENTE['email'])

    primero = cliente_http.post(
        '/api/auth/restablecer-password',
        json={'token': token, 'password': 'NuevaClave123'},
    )
    segundo = cliente_http.post(
        '/api/auth/restablecer-password',
        json={'token': token, 'password': 'OtraClave456'},
    )

    assert primero.status_code == 200
    assert segundo.status_code == 400
    assert segundo.json()['codigo'] == 'token_recuperacion_invalido'


def test_la_nueva_contrasena_debe_ser_segura(cliente_http):
    token = solicitar_enlace(cliente_http, CLIENTE['email'])

    respuesta = cliente_http.post(
        '/api/auth/restablecer-password',
        json={'token': token, 'password': 'corta'},
    )

    assert respuesta.status_code == 422
    assert 'password' in respuesta.json()['errors']


def test_restablecer_con_un_token_inventado(cliente_http):
    respuesta = cliente_http.post(
        '/api/auth/restablecer-password',
        json={'token': TOKEN_INVENTADO, 'password': 'NuevaClave123'},
    )

    assert respuesta.status_code == 400
    assert respuesta.json()['codigo'] == 'token_recuperacion_invalido'


# ---------------------------------------------------------------------------
# Limites del endpoint publico de recuperacion
#
# Sin estos topes, cualquiera puede llenar el buzon de una persona registrada
# pulsando el boton en bucle. Son 83 correos en una tarde.
# ---------------------------------------------------------------------------
def pedir(cliente_http, email='cliente@jhmtech.com'):
    return cliente_http.post('/api/auth/recuperar-password', json={'email': email})


def test_no_manda_un_correo_nuevo_si_el_enlace_anterior_sigue_vigente(cliente_http, sesion_de_prueba):
    from app.models import TokenRecuperacion

    primera = pedir(cliente_http)
    segunda = pedir(cliente_http)

    assert primera.status_code == 200
    assert segunda.status_code == 200
    # La segunda responde igual, pero no genera otro enlace.
    assert primera.json()['enlace'] is not None
    assert segunda.json()['enlace'] is None
    assert sesion_de_prueba.query(TokenRecuperacion).count() == 1


def test_el_tercer_intento_seguido_deja_de_responder_con_enlace(cliente_http):
    enlaces = [pedir(cliente_http).json()['enlace'] for _ in range(5)]

    # Solo el primero entrega enlace; el resto sale por el tope o por el
    # enlace vigente, siempre con la misma respuesta de cara al usuario.
    assert enlaces[0] is not None
    assert all(e is None for e in enlaces[1:])


def test_el_mensaje_no_cambia_aunque_se_alcance_el_tope(cliente_http):
    mensajes = {pedir(cliente_http).json()['message'] for _ in range(5)}

    # Un mensaje distinto al llegar al tope delataria que el correo existe.
    assert len(mensajes) == 1


def test_el_tope_por_correo_no_delata_las_cuentas_que_existen(cliente_http):
    registrado = [pedir(cliente_http).json() for _ in range(4)]
    inventado = [pedir(cliente_http, 'nadie@ejemplo.com').json() for _ in range(4)]

    assert [r['message'] for r in registrado] == [i['message'] for i in inventado]


def test_demasiadas_solicitudes_desde_el_mismo_equipo_devuelven_429(cliente_http):
    # El tope por IP es de 10 por hora, con correos distintos cada vez para
    # que no salte antes el tope por correo.
    respuestas = [pedir(cliente_http, f'persona{i}@ejemplo.com') for i in range(12)]

    assert all(r.status_code == 200 for r in respuestas[:10])
    assert respuestas[10].status_code == 429
    assert respuestas[10].json()['codigo'] == 'demasiadas_solicitudes'


def test_el_limite_no_estorba_al_restablecer_con_un_enlace_valido(cliente_http):
    enlace = pedir(cliente_http).json()['enlace']
    token = enlace.rsplit('/', 1)[1]

    respuesta = cliente_http.post(
        '/api/auth/restablecer-password',
        json={'token': token, 'password': 'NuevaClave123'},
    )

    assert respuesta.status_code == 200, respuesta.text
