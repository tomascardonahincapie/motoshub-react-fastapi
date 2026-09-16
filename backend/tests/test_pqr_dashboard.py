"""Pruebas de PQR, Dashboards y chatbot (quinto avance)."""

from tests.conftest import cabecera

CASCO = {'tipo_item': 'producto', 'id_item': 1, 'cantidad': 1}

PQR_VALIDA = {
    'tipo': 'reclamo',
    'asunto': 'El casco llegó con un rayón',
    'descripcion': 'Al abrir la caja el casco tenía un rayón en el lateral derecho.',
}


def radicar(cliente_http, token, **extra):
    return cliente_http.post('/api/pqr', json={**PQR_VALIDA, **extra}, headers=cabecera(token))


# ---------------------------------------------------------------------------
# PQR
# ---------------------------------------------------------------------------
def test_el_cliente_radica_una_pqr_y_recibe_su_radicado(cliente_http, token_cliente):
    respuesta = radicar(cliente_http, token_cliente)

    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()['radicado'].startswith('PQR-')


def test_la_pqr_nace_pendiente(cliente_http, token_cliente):
    radicar(cliente_http, token_cliente)

    datos = cliente_http.get('/api/pqr', headers=cabecera(token_cliente)).json()

    assert datos['pqr'][0]['estado'] == 'pendiente'
    assert datos['resumen']['pendientes'] == 1


def test_rechaza_una_descripcion_demasiado_corta(cliente_http, token_cliente):
    respuesta = radicar(cliente_http, token_cliente, descripcion='No sirve')

    assert respuesta.status_code == 422


def test_el_cliente_solo_ve_sus_propias_pqr(cliente_http, token_cliente, token_admin):
    radicar(cliente_http, token_cliente)
    radicar(cliente_http, token_admin)

    del_cliente = cliente_http.get('/api/pqr', headers=cabecera(token_cliente)).json()
    del_admin = cliente_http.get('/api/pqr', headers=cabecera(token_admin)).json()

    assert del_cliente['resumen']['total'] == 1
    assert del_admin['resumen']['total'] == 2


def test_el_empleado_responde_la_pqr_y_queda_registrado(cliente_http, token_cliente, token_empleado):
    id_pqr = radicar(cliente_http, token_cliente).json()['id_pqr']

    respuesta = cliente_http.patch(
        f'/api/pqr/{id_pqr}',
        json={'estado': 'respondida', 'respuesta': 'Le enviamos un casco de reemplazo hoy mismo.'},
        headers=cabecera(token_empleado),
    )

    assert respuesta.status_code == 200, respuesta.text
    registro = respuesta.json()['pqr']
    assert registro['estado'] == 'respondida'
    assert registro['agente_nombre'] == 'Laura Gomez'
    assert registro['fecha_respuesta'] is not None


def test_el_cliente_no_puede_responder_su_propia_pqr(cliente_http, token_cliente):
    id_pqr = radicar(cliente_http, token_cliente).json()['id_pqr']

    respuesta = cliente_http.patch(
        f'/api/pqr/{id_pqr}',
        json={'estado': 'cerrada', 'respuesta': 'Resuelto por mí mismo'},
        headers=cabecera(token_cliente),
    )

    assert respuesta.status_code == 403


def test_el_cliente_no_puede_leer_la_pqr_de_otro(cliente_http, token_cliente, token_admin):
    ajena = radicar(cliente_http, token_admin).json()['id_pqr']

    respuesta = cliente_http.get(f'/api/pqr/{ajena}', headers=cabecera(token_cliente))

    assert respuesta.status_code == 403


def test_las_pqr_se_filtran_por_tipo_y_por_estado(cliente_http, token_cliente, token_admin):
    radicar(cliente_http, token_cliente)
    radicar(cliente_http, token_cliente, tipo='sugerencia', asunto='Amplíen el horario')

    quejas = cliente_http.get(
        '/api/pqr', params={'tipo': 'reclamo'}, headers=cabecera(token_admin),
    ).json()['pqr']
    cerradas = cliente_http.get(
        '/api/pqr', params={'estado': 'cerrada'}, headers=cabecera(token_admin),
    ).json()['pqr']

    assert len(quejas) == 1
    assert cerradas == []


# ---------------------------------------------------------------------------
# Dashboards: los tres roles llaman a la misma ruta y ven cosas distintas
# ---------------------------------------------------------------------------
def vender(cliente_http, token):
    return cliente_http.post(
        '/api/ventas', json={'items': [CASCO]}, headers=cabecera(token),
    ).json()


def test_el_administrador_ve_los_indicadores_de_todo_el_sistema(cliente_http, token_admin):
    datos = cliente_http.get('/api/estadisticas/resumen', headers=cabecera(token_admin)).json()

    assert datos['rol'] == 'Administrador'
    indicadores = datos['indicadores']
    assert indicadores['usuarios'] == 3
    assert indicadores['clientes'] == 1
    assert indicadores['productos'] == 1
    assert indicadores['servicios'] == 1


def test_el_empleado_ve_la_operacion_pero_no_las_cuentas_de_usuarios(cliente_http, token_empleado):
    indicadores = cliente_http.get(
        '/api/estadisticas/resumen', headers=cabecera(token_empleado),
    ).json()['indicadores']

    assert indicadores['productos'] == 1
    assert indicadores['usuarios'] is None
    assert indicadores['clientes'] is None


def test_el_cliente_solo_ve_sus_propias_cifras(cliente_http, token_cliente, token_admin):
    vender(cliente_http, token_cliente)
    vender(cliente_http, token_admin)

    datos = cliente_http.get('/api/estadisticas/resumen', headers=cabecera(token_cliente)).json()

    assert datos['rol'] == 'Cliente'
    assert datos['indicadores']['ventas_cantidad'] == 1
    assert datos['indicadores']['usuarios'] is None
    assert datos['indicadores']['valor_inventario'] is None


def test_el_dashboard_de_ventas_devuelve_la_serie_completa_del_rango(cliente_http, token_admin):
    datos = cliente_http.get(
        '/api/estadisticas/ventas',
        params={'desde': '2026-01-01', 'hasta': '2026-01-10', 'agrupar': 'dia'},
        headers=cabecera(token_admin),
    ).json()

    # Diez dias, incluidos los que no tuvieron ventas: si no, el grafico mentiria.
    assert len(datos['serie']) == 10
    assert datos['serie'][0]['etiqueta'] == '1 ene'
    assert all(punto['total'] == '0.00' for punto in datos['serie'])


def test_la_serie_agrupada_por_mes_junta_los_dias(cliente_http, token_admin):
    datos = cliente_http.get(
        '/api/estadisticas/ventas',
        params={'desde': '2026-01-01', 'hasta': '2026-03-31', 'agrupar': 'mes'},
        headers=cabecera(token_admin),
    ).json()

    assert [punto['etiqueta'] for punto in datos['serie']] == ['ene 2026', 'feb 2026', 'mar 2026']


def test_la_venta_aparece_en_la_serie_y_en_el_ranking(cliente_http, token_cliente, token_admin):
    vender(cliente_http, token_cliente)

    datos = cliente_http.get('/api/estadisticas/ventas', headers=cabecera(token_admin)).json()

    assert sum(punto['cantidad'] for punto in datos['serie']) == 1
    assert datos['ranking'][0]['nombre'] == 'Casco Integral MT'
    assert datos['por_metodo_pago'][0]['clave'] == 'efectivo'


def test_un_rango_al_reves_se_endereza_en_vez_de_fallar(cliente_http, token_admin):
    respuesta = cliente_http.get(
        '/api/estadisticas/ventas',
        params={'desde': '2026-03-31', 'hasta': '2026-01-01'},
        headers=cabecera(token_admin),
    )

    assert respuesta.status_code == 200
    assert respuesta.json()['desde'] == '2026-01-01'


def test_el_dashboard_exige_iniciar_sesion(cliente_http):
    assert cliente_http.get('/api/estadisticas/resumen').status_code == 401
    assert cliente_http.get('/api/estadisticas/ventas').status_code == 401
