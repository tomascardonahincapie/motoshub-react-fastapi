"""Pruebas del chatbot y de su integracion con IA (quinto avance).

No se llama al proveedor de IA de verdad: una prueba automatica no debe
depender de una clave ni gastar saldo. Se comprueba el motor de reglas, que es
lo que responde cuando no hay API Key, y se simula el proveedor para verificar
que la integracion arma bien la peticion y aprovecha la respuesta.
"""

import httpx
import pytest

from app.core.configuracion import configuracion
from app.servicios import ia as servicio_ia
from tests.conftest import cabecera


@pytest.fixture()
def con_ia_simulada(monkeypatch):
    """Activa un proveedor de IA de mentira que responde siempre lo mismo."""
    monkeypatch.setattr(configuracion, 'ia_proveedor', 'anthropic')
    monkeypatch.setattr(configuracion, 'ia_api_key', 'clave-de-prueba')
    monkeypatch.setattr(configuracion, 'ia_modelo', 'modelo-de-prueba')

    recibido = {}

    def falso_post(url, **opciones):
        recibido['url'] = url
        recibido['json'] = opciones.get('json', {})
        recibido['headers'] = opciones.get('headers', {})
        return httpx.Response(
            200,
            json={'content': [{'type': 'text', 'text': 'Tenemos el Kawasaki Ninja 400.'}]},
            request=httpx.Request('POST', url),
        )

    monkeypatch.setattr(httpx, 'post', falso_post)
    return recibido


# ---------------------------------------------------------------------------
# Estado y motor de reglas
# ---------------------------------------------------------------------------
def test_sin_api_key_el_chatbot_avisa_que_responde_con_reglas(cliente_http):
    datos = cliente_http.get('/api/chatbot/estado').json()

    assert datos['ia_activa'] is False
    assert datos['modelo'] == 'reglas'
    assert datos['api_key_configurada'] is False


def test_el_estado_nunca_devuelve_la_clave(cliente_http, monkeypatch):
    monkeypatch.setattr(configuracion, 'ia_api_key', 'sk-secreta-1234')

    cuerpo = cliente_http.get('/api/chatbot/estado').text

    assert 'sk-secreta' not in cuerpo
    assert '"api_key_configurada":true' in cuerpo.replace(' ', '')


def test_un_visitante_sin_cuenta_puede_preguntar(cliente_http):
    respuesta = cliente_http.post('/api/chatbot/mensaje', json={'mensaje': 'Hola, buenas tardes'})

    assert respuesta.status_code == 200, respuesta.text
    datos = respuesta.json()
    assert datos['conversacion_id'] >= 1
    assert datos['con_ia'] is False
    assert datos['origen'] == 'reglas'
    assert datos['sugerencias']


def test_el_chatbot_responde_con_el_catalogo_real(cliente_http):
    respuesta = cliente_http.post(
        '/api/chatbot/mensaje', json={'mensaje': '¿Qué motos tienen?'},
    ).json()

    # La moto de la semilla cuesta 480.000: el precio sale de la base de datos.
    assert 'Kawasaki Ninja 400' in respuesta['respuesta']
    assert '480.000' in respuesta['respuesta']


def test_el_chatbot_orienta_sobre_como_radicar_una_pqr(cliente_http):
    respuesta = cliente_http.post(
        '/api/chatbot/mensaje', json={'mensaje': 'Quiero poner una queja'},
    ).json()

    assert 'PQR' in respuesta['respuesta']
    assert 'radicado' in respuesta['respuesta'].lower()


def test_entiende_un_presupuesto_expresado_en_millones(cliente_http):
    respuesta = cliente_http.post(
        '/api/chatbot/mensaje', json={'mensaje': '¿Qué motos tienen por menos de 1 millón?'},
    ).json()

    assert '1.000.000' in respuesta['respuesta']


def test_la_conversacion_mantiene_el_hilo(cliente_http):
    primera = cliente_http.post('/api/chatbot/mensaje', json={'mensaje': 'Hola'}).json()

    segunda = cliente_http.post('/api/chatbot/mensaje', json={
        'mensaje': '¿Y los servicios?', 'conversacion_id': primera['conversacion_id'],
    }).json()

    assert segunda['conversacion_id'] == primera['conversacion_id']


def test_rechaza_un_mensaje_vacio(cliente_http):
    assert cliente_http.post('/api/chatbot/mensaje', json={'mensaje': '   '}).status_code == 422


# ---------------------------------------------------------------------------
# Integracion con el proveedor de IA
# ---------------------------------------------------------------------------
def test_con_api_key_la_respuesta_viene_del_modelo(cliente_http, con_ia_simulada):
    respuesta = cliente_http.post(
        '/api/chatbot/mensaje', json={'mensaje': '¿Qué motos tienen?'},
    ).json()

    assert respuesta['con_ia'] is True
    assert respuesta['origen'] == 'modelo-de-prueba'
    assert respuesta['respuesta'] == 'Tenemos el Kawasaki Ninja 400.'


def test_al_modelo_se_le_entrega_el_catalogo_de_la_base_de_datos(cliente_http, con_ia_simulada):
    cliente_http.post('/api/chatbot/mensaje', json={'mensaje': '¿Qué venden?'})

    instrucciones = con_ia_simulada['json']['system']
    assert 'Kawasaki Ninja 400' in instrucciones
    assert 'Cambio de Aceite' in instrucciones
    # Y la clave viaja en la cabecera, no en el cuerpo ni en la URL.
    assert con_ia_simulada['headers']['x-api-key'] == 'clave-de-prueba'
    assert 'clave-de-prueba' not in str(con_ia_simulada['json'])


def test_si_el_proveedor_falla_el_chatbot_sigue_atendiendo(cliente_http, monkeypatch):
    """Una caida del servicio de IA no puede dejar el sitio sin atencion."""
    monkeypatch.setattr(configuracion, 'ia_proveedor', 'anthropic')
    monkeypatch.setattr(configuracion, 'ia_api_key', 'clave-de-prueba')

    def falla(url, **opciones):
        raise httpx.ConnectTimeout('sin conexión con el proveedor')

    monkeypatch.setattr(httpx, 'post', falla)

    respuesta = cliente_http.post(
        '/api/chatbot/mensaje', json={'mensaje': '¿Qué motos tienen?'},
    )

    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos['con_ia'] is False
    assert 'Kawasaki Ninja 400' in datos['respuesta']


def test_un_error_del_proveedor_no_filtra_la_clave_en_la_respuesta(cliente_http, monkeypatch):
    monkeypatch.setattr(configuracion, 'ia_proveedor', 'openai')
    monkeypatch.setattr(configuracion, 'ia_api_key', 'sk-secreta-1234')

    def rechaza(url, **opciones):
        peticion = httpx.Request('POST', url)
        raise httpx.HTTPStatusError(
            'no autorizado', request=peticion,
            response=httpx.Response(401, request=peticion),
        )

    monkeypatch.setattr(httpx, 'post', rechaza)

    cuerpo = cliente_http.post('/api/chatbot/mensaje', json={'mensaje': 'Hola'}).text

    assert 'sk-secreta' not in cuerpo


def test_el_proveedor_desconocido_se_trata_como_si_no_hubiera_ia():
    from app.core.configuracion import Configuracion

    ajustes = Configuracion(ia_proveedor='inventado', ia_api_key='x')

    assert ajustes.ia_proveedor == 'ninguno'
    assert ajustes.ia_configurada is False


def test_la_api_key_se_limpia_de_espacios_al_copiarla():
    from app.core.configuracion import Configuracion

    ajustes = Configuracion(ia_api_key='sk ant api 03 abcd')

    assert ajustes.ia_api_key == 'skantapi03abcd'


def test_nadie_puede_leer_la_conversacion_de_otro(cliente_http, token_cliente, token_admin):
    propia = cliente_http.post(
        '/api/chatbot/mensaje', json={'mensaje': 'Hola'}, headers=cabecera(token_cliente),
    ).json()['conversacion_id']

    # El administrador sí, porque atiende el canal; otro cliente no.
    assert cliente_http.get(
        f'/api/chatbot/conversaciones/{propia}', headers=cabecera(token_admin),
    ).status_code == 200
    assert cliente_http.get(f'/api/chatbot/conversaciones/{propia}').status_code == 403


def test_las_charlas_anonimas_no_se_pueden_recuperar_por_la_api(cliente_http):
    """Los identificadores son consecutivos: no deben servir para fisgonear."""
    anonima = cliente_http.post(
        '/api/chatbot/mensaje', json={'mensaje': 'Hola'},
    ).json()['conversacion_id']

    assert cliente_http.get(f'/api/chatbot/conversaciones/{anonima}').status_code == 403
