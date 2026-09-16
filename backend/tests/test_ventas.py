"""Pruebas del modulo de ventas y facturacion (quinto avance)."""

from tests.conftest import cabecera

CASCO = {'tipo_item': 'producto', 'id_item': 1, 'cantidad': 1}
ACEITE = {'tipo_item': 'servicio', 'id_item': 1, 'cantidad': 1}

# Datos de la semilla: casco 480.000 y cambio de aceite 70.000, IVA del 19 %.
PRECIO_CASCO = 480000
PRECIO_ACEITE = 70000


def registrar(cliente_http, token, **extra):
    cuerpo = {'items': [CASCO], 'metodo_pago': 'efectivo', **extra}
    return cliente_http.post('/api/ventas', json=cuerpo, headers=cabecera(token))


# ---------------------------------------------------------------------------
# Registro de ventas
# ---------------------------------------------------------------------------
def test_el_cliente_registra_su_compra_y_recibe_numero_y_factura(cliente_http, token_cliente):
    respuesta = registrar(cliente_http, token_cliente)

    assert respuesta.status_code == 201, respuesta.text
    datos = respuesta.json()
    assert datos['numero_venta'].startswith('V-')
    assert datos['numero_factura'].startswith('FV-')
    # 480.000 + 19 % = 571.200
    assert float(datos['total']) == PRECIO_CASCO * 1.19


def test_los_precios_salen_del_catalogo_y_no_de_la_peticion(cliente_http, token_cliente):
    """Enviar un precio en la peticion no debe abaratar la compra."""
    respuesta = cliente_http.post(
        '/api/ventas',
        json={'items': [{**CASCO, 'precio_unitario': 1000, 'subtotal': 1000}]},
        headers=cabecera(token_cliente),
    )

    assert respuesta.status_code == 201, respuesta.text
    assert float(respuesta.json()['total']) == PRECIO_CASCO * 1.19


def test_la_venta_descuenta_el_stock(cliente_http, token_cliente):
    antes = cliente_http.get('/api/productos/1').json()['producto']['stock']

    registrar(cliente_http, token_cliente, items=[{**CASCO, 'cantidad': 3}])

    despues = cliente_http.get('/api/productos/1').json()['producto']['stock']
    assert despues == antes - 3


def test_rechaza_la_venta_cuando_no_alcanza_el_stock(cliente_http, token_cliente):
    respuesta = registrar(cliente_http, token_cliente, items=[{**CASCO, 'cantidad': 999}])

    assert respuesta.status_code == 409
    assert 'stock' in respuesta.json()['message'].lower()


def test_suma_varias_lineas_del_mismo_producto_antes_de_mirar_el_stock(cliente_http, token_cliente):
    """Veinte unidades en dos lineas de quince tampoco deben pasar."""
    respuesta = registrar(
        cliente_http, token_cliente,
        items=[{**CASCO, 'cantidad': 15}, {**CASCO, 'cantidad': 15}],
    )

    assert respuesta.status_code == 409


def test_vende_productos_y_servicios_en_la_misma_operacion(cliente_http, token_cliente):
    respuesta = registrar(cliente_http, token_cliente, items=[CASCO, ACEITE])

    assert respuesta.status_code == 201, respuesta.text
    esperado = (PRECIO_CASCO + PRECIO_ACEITE) * 1.19
    assert round(float(respuesta.json()['total'])) == round(esperado)


def test_rechaza_un_articulo_que_no_existe(cliente_http, token_cliente):
    respuesta = registrar(cliente_http, token_cliente, items=[{**CASCO, 'id_item': 9999}])

    assert respuesta.status_code == 404


def test_exige_al_menos_un_articulo(cliente_http, token_cliente):
    respuesta = cliente_http.post('/api/ventas', json={'items': []}, headers=cabecera(token_cliente))

    assert respuesta.status_code == 422


def test_una_venta_a_credito_queda_pendiente_de_cobro(cliente_http, token_cliente):
    registrar(cliente_http, token_cliente, metodo_pago='credito')

    venta = cliente_http.get('/api/ventas', headers=cabecera(token_cliente)).json()['ventas'][0]
    assert venta['estado'] == 'pendiente'


def test_sin_token_no_se_puede_vender(cliente_http):
    respuesta = cliente_http.post('/api/ventas', json={'items': [CASCO]})

    assert respuesta.status_code == 401


# ---------------------------------------------------------------------------
# Historial y control de acceso
# ---------------------------------------------------------------------------
def test_el_cliente_solo_ve_sus_propias_compras(cliente_http, token_cliente, token_admin):
    registrar(cliente_http, token_cliente)
    # El administrador vende a su propio nombre: esa venta no es del cliente.
    registrar(cliente_http, token_admin)

    del_cliente = cliente_http.get('/api/ventas', headers=cabecera(token_cliente)).json()
    del_admin = cliente_http.get('/api/ventas', headers=cabecera(token_admin)).json()

    assert del_cliente['resumen']['cantidad'] == 1
    assert del_admin['resumen']['cantidad'] == 2


def test_el_cliente_no_puede_espiar_la_venta_de_otro(cliente_http, token_cliente, token_admin):
    ajena = registrar(cliente_http, token_admin).json()['id_venta']

    respuesta = cliente_http.get(f'/api/ventas/{ajena}', headers=cabecera(token_cliente))

    assert respuesta.status_code == 403


def test_el_cliente_no_puede_forzar_el_filtro_para_ver_otras_ventas(cliente_http, token_cliente, token_admin):
    """Pasar cliente_id de otra persona no amplia lo que el cliente ve."""
    registrar(cliente_http, token_admin)

    respuesta = cliente_http.get(
        '/api/ventas', params={'cliente_id': 1}, headers=cabecera(token_cliente),
    )

    assert respuesta.json()['resumen']['cantidad'] == 0


def test_el_empleado_vende_a_nombre_de_un_cliente(cliente_http, token_empleado):
    respuesta = cliente_http.post(
        '/api/ventas',
        json={'items': [CASCO], 'cliente_id': 3},
        headers=cabecera(token_empleado),
    )

    assert respuesta.status_code == 201, respuesta.text
    venta = cliente_http.get(
        f"/api/ventas/{respuesta.json()['id_venta']}", headers=cabecera(token_empleado),
    ).json()['venta']
    assert venta['cliente_id'] == 3
    assert venta['vendedor_nombre'] == 'Laura Gomez'


def test_el_historial_filtra_por_estado_y_por_producto(cliente_http, token_cliente, token_admin):
    registrar(cliente_http, token_cliente)
    registrar(cliente_http, token_cliente, items=[ACEITE])

    por_producto = cliente_http.get(
        '/api/ventas', params={'producto_id': 1}, headers=cabecera(token_admin),
    ).json()
    por_estado = cliente_http.get(
        '/api/ventas', params={'estado': 'anulada'}, headers=cabecera(token_admin),
    ).json()

    assert por_producto['resumen']['cantidad'] == 1
    assert por_estado['resumen']['cantidad'] == 0


def test_anular_la_venta_devuelve_las_unidades_al_inventario(cliente_http, token_cliente, token_admin):
    antes = cliente_http.get('/api/productos/1').json()['producto']['stock']
    id_venta = registrar(cliente_http, token_cliente, items=[{**CASCO, 'cantidad': 2}]).json()['id_venta']

    respuesta = cliente_http.patch(
        f'/api/ventas/{id_venta}/estado',
        json={'estado': 'anulada'},
        headers=cabecera(token_admin),
    )

    assert respuesta.status_code == 200, respuesta.text
    assert cliente_http.get('/api/productos/1').json()['producto']['stock'] == antes


def test_el_cliente_no_puede_anular_su_propia_venta(cliente_http, token_cliente):
    id_venta = registrar(cliente_http, token_cliente).json()['id_venta']

    respuesta = cliente_http.patch(
        f'/api/ventas/{id_venta}/estado',
        json={'estado': 'anulada'},
        headers=cabecera(token_cliente),
    )

    assert respuesta.status_code == 403


def test_una_venta_anulada_no_suma_al_total_del_historial(cliente_http, token_cliente, token_admin):
    id_venta = registrar(cliente_http, token_cliente).json()['id_venta']
    cliente_http.patch(f'/api/ventas/{id_venta}/estado', json={'estado': 'anulada'},
                       headers=cabecera(token_admin))

    resumen = cliente_http.get('/api/ventas', headers=cabecera(token_admin)).json()['resumen']

    assert resumen['cantidad'] == 1
    assert float(resumen['total']) == 0
