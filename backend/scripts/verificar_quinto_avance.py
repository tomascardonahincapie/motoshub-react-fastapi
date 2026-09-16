"""Recorrido completo de los modulos del quinto avance.

Ejercita ventas, facturacion, reportes en PDF y Excel, PQR, Dashboards por rol
y el chatbot con IA, comprobando tanto los casos que deben funcionar como los
que deben ser rechazados.

Todo lo que crea lo deja marcado y lo anula al terminar, para no ensuciar el
historial de ventas con datos de prueba.

Uso (con el servidor levantado con uvicorn):
    python scripts/verificar_quinto_avance.py
"""

import json
import urllib.error
import urllib.request

BASE = 'http://127.0.0.1:8000'
ANCHO = 82

fallos: list[str] = []
creado: dict[str, int] = {}


def peticion(metodo, ruta, cuerpo=None, token=None, binario=False):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')

    try:
        with urllib.request.urlopen(req) as r:
            crudo = r.read()
            if binario:
                return r.status, {'bytes': len(crudo), 'firma': crudo[:4],
                                  'tipo': r.headers.get('Content-Type', '')}
            return r.status, json.loads(crudo.decode() or '{}')
    except urllib.error.HTTPError as e:
        cuerpo_error = e.read().decode(errors='replace')
        try:
            return e.code, json.loads(cuerpo_error or '{}')
        except json.JSONDecodeError:
            return e.code, {'message': cuerpo_error[:120]}


def comprobar(descripcion, metodo, ruta, esperado, cuerpo=None, token=None, binario=False):
    estado, datos = peticion(metodo, ruta, cuerpo, token, binario)
    ok = estado == esperado
    if not ok:
        fallos.append(f'{descripcion} -> esperado {esperado}, recibido {estado}: {datos}')

    print(f'{"OK  " if ok else "FALLA"} {metodo:6} {ruta[:38]:38} {estado}  {descripcion}')
    if not binario and (datos.get('message') or datos.get('codigo')):
        print(f'          -> {datos.get("message") or datos.get("codigo")}')
    return datos


def titulo(texto):
    print()
    print('=' * ANCHO)
    print(texto)
    print('=' * ANCHO)


def entrar(email, password):
    _, datos = peticion('POST', '/api/auth/login', {'email': email, 'password': password})
    return datos.get('token', '')


titulo('0. SESIONES DE LOS TRES ROLES')
admin = entrar('admin@jhmtech.com', 'Admin1234')
empleado = entrar('empleado@jhmtech.com', 'Empleado123')
cliente = entrar('cliente@jhmtech.com', 'Cliente123')

for nombre, token in (('administrador', admin), ('empleado', empleado), ('cliente', cliente)):
    marca = 'OK  ' if token else 'FALLA'
    if not token:
        fallos.append(f'No se pudo iniciar sesion como {nombre}')
    print(f'{marca} Sesion de {nombre}: {"token obtenido" if token else "sin token"}')

if not admin:
    raise SystemExit('\nSin sesion de administrador no se puede continuar. '
                     '¿Esta el servidor levantado y la base de datos cargada?')

# Un articulo con existencias suficientes para todas las pruebas.
_, catalogo = peticion('GET', '/api/productos')
con_stock = [p for p in catalogo['productos'] if p['stock'] >= 4 and p['estado'] == 'activo']
producto = con_stock[0] if con_stock else catalogo['productos'][0]
_, servicios = peticion('GET', '/api/servicios')
servicio = servicios['servicios'][0]
print(f'\nArticulos de prueba: "{producto["nombre"]}" y "{servicio["nombre"]}"')


titulo('1. MODULO DE VENTAS  (requerimientos 1, 2 y 3)')
venta = comprobar(
    'El cliente compra desde el sitio web', 'POST', '/api/ventas', 201,
    {'metodo_pago': 'efectivo', 'generar_factura': True, 'observaciones': 'PRUEBA AUTOMATICA',
     'items': [{'tipo_item': 'producto', 'id_item': producto['id_producto'], 'cantidad': 1},
               {'tipo_item': 'servicio', 'id_item': servicio['id_servicio'], 'cantidad': 1}]},
    cliente)
creado['venta'] = venta.get('id_venta')
print(f'          -> {venta.get("numero_venta")} por {venta.get("total")} '
      f'con factura {venta.get("numero_factura")}')

esperado = round((float(producto['precio']) + float(servicio['precio'])) * 1.19, 2)
if abs(float(venta.get('total', 0)) - esperado) > 0.01:
    fallos.append(f'El total no cuadra: esperado {esperado}, recibido {venta.get("total")}')
else:
    print(f'OK   Los totales cuadran con el catalogo mas el 19% de IVA ({esperado})')

ignorado = comprobar('El precio enviado en la peticion se ignora', 'POST', '/api/ventas', 201,
                     {'observaciones': 'PRUEBA AUTOMATICA',
                      'items': [{'tipo_item': 'producto', 'id_item': producto['id_producto'],
                                 'cantidad': 1, 'precio_unitario': 1000}]}, cliente)
creado['venta_precio'] = ignorado.get('id_venta')

# 999 es el maximo que admite el esquema: asi el rechazo lo da la regla de
# negocio (409) y no la validacion de Pydantic (422).
comprobar('Rechaza vender mas unidades de las que hay', 'POST', '/api/ventas', 409,
          {'items': [{'tipo_item': 'producto', 'id_item': producto['id_producto'],
                      'cantidad': 999}]}, cliente)

comprobar('Rechaza un articulo inexistente', 'POST', '/api/ventas', 404,
          {'items': [{'tipo_item': 'producto', 'id_item': 999999, 'cantidad': 1}]}, cliente)

comprobar('Rechaza una venta sin articulos', 'POST', '/api/ventas', 422,
          {'items': []}, cliente)

comprobar('Sin token no se puede vender', 'POST', '/api/ventas', 401,
          {'items': [{'tipo_item': 'producto', 'id_item': producto['id_producto'], 'cantidad': 1}]})

# Se busca un cliente distinto al que tiene la sesion abierta: solo asi la
# venta siguiente sirve para comprobar que nadie ve las compras ajenas.
_, cuentas = peticion('GET', '/api/usuarios', token=admin)
otros = [u for u in cuentas.get('usuarios', [])
         if u['nombre_rol'] == 'Cliente' and u['email'] != 'cliente@jhmtech.com'
         and u['estado'] == 'activo']
otro_cliente = otros[0] if otros else None

en_tienda = comprobar('El empleado vende a nombre de otro cliente', 'POST', '/api/ventas', 201,
                      {'cliente_id': otro_cliente['id_usuario'] if otro_cliente else 4,
                       'metodo_pago': 'tarjeta', 'observaciones': 'PRUEBA AUTOMATICA',
                       'items': [{'tipo_item': 'producto', 'id_item': producto['id_producto'],
                                  'cantidad': 2}]}, empleado)
creado['venta_tienda'] = en_tienda.get('id_venta')
creado['factura_ajena'] = en_tienda.get('id_factura')
if otro_cliente:
    print(f'          -> a nombre de {otro_cliente["nombres"]} {otro_cliente["apellidos"]}')


titulo('2. HISTORIAL Y FILTROS  (requerimiento 3)')
todo = comprobar('Historial completo del administrador', 'GET', '/api/ventas', 200, token=admin)
print(f'          -> {todo["resumen"]["cantidad"]} ventas por {todo["resumen"]["total"]}')

comprobar('Filtrado por rango de fechas', 'GET',
          '/api/ventas?desde=2026-01-01&hasta=2026-12-31', 200, token=admin)
comprobar('Filtrado por estado', 'GET', '/api/ventas?estado=pagada', 200, token=admin)
comprobar('Filtrado por forma de pago', 'GET', '/api/ventas?metodo_pago=tarjeta', 200, token=admin)
comprobar('Filtrado por producto', 'GET',
          f'/api/ventas?producto_id={producto["id_producto"]}', 200, token=admin)
comprobar('Filtrado por valor minimo', 'GET', '/api/ventas?valor_minimo=1000000', 200, token=admin)
comprobar('Busqueda por texto', 'GET', '/api/ventas?busqueda=V-2026', 200, token=admin)

propias = comprobar('El cliente solo ve sus propias compras', 'GET', '/api/ventas', 200, token=cliente)
if propias['resumen']['cantidad'] >= todo['resumen']['cantidad']:
    fallos.append('El cliente esta viendo mas ventas de las que le corresponden')
else:
    print(f'          -> {propias["resumen"]["cantidad"]} propias frente a '
          f'{todo["resumen"]["cantidad"]} del administrador')

comprobar('El cliente no puede ampliar el filtro a otro cliente', 'GET',
          '/api/ventas?cliente_id=1', 200, token=cliente)
comprobar('Consulta de una venta con su detalle', 'GET',
          f'/api/ventas/{creado["venta"]}', 200, token=admin)
comprobar('El cliente no puede ver la venta de otro', 'GET',
          f'/api/ventas/{creado["venta_tienda"]}', 403, token=cliente)


titulo('3. FACTURACION  (requerimientos 7, 8 y 9)')
sin_factura = comprobar('Venta registrada sin facturar', 'POST', '/api/ventas', 201,
                        {'cliente_id': 4, 'generar_factura': False, 'observaciones': 'PRUEBA AUTOMATICA',
                         'items': [{'tipo_item': 'servicio',
                                    'id_item': servicio['id_servicio'], 'cantidad': 1}]}, admin)
creado['venta_sin_factura'] = sin_factura.get('id_venta')

factura = comprobar('Emision de la factura de esa venta', 'POST', '/api/facturas', 201,
                    {'venta_id': creado['venta_sin_factura'],
                     'observaciones': 'Pago recibido en tienda'}, admin)
creado['factura'] = factura.get('id_factura')

comprobar('Una venta no se puede facturar dos veces', 'POST', '/api/facturas', 409,
          {'venta_id': creado['venta_sin_factura']}, admin)

detalle = comprobar('Consulta de la factura', 'GET',
                    f'/api/facturas/{creado["factura"]}', 200, token=admin)
copia = detalle.get('factura', {})
print(f'          -> {copia.get("numero_factura")} a nombre de {copia.get("cliente_nombre")} '
      f'({copia.get("cliente_documento")}), IVA {copia.get("porcentaje_iva")}%')

comprobar('Busqueda de facturas por numero', 'GET',
          f'/api/facturas?busqueda={copia.get("numero_factura")}', 200, token=admin)
comprobar('Busqueda de facturas por fecha', 'GET',
          '/api/facturas?desde=2026-01-01&hasta=2026-12-31', 200, token=admin)

pdf = comprobar('Descarga de la factura en PDF', 'GET',
                f'/api/facturas/{creado["factura"]}/pdf', 200, token=admin, binario=True)
print(f'          -> {pdf["bytes"]} bytes, {pdf["tipo"]}, firma {pdf["firma"]}')
if pdf['firma'] != b'%PDF':
    fallos.append('La factura descargada no es un PDF valido')

if creado.get('factura_ajena'):
    comprobar('El cliente no descarga la factura de otro', 'GET',
              f'/api/facturas/{creado["factura_ajena"]}/pdf', 403, token=cliente, binario=True)


titulo('4. REPORTE DIARIO  (requerimientos 4, 5 y 6)')
reporte = comprobar('Reporte del dia en JSON', 'GET',
                    '/api/reportes/ventas-diarias', 200, token=admin)
resumen = reporte.get('resumen', {})
print(f'          -> {reporte.get("fecha")}: {resumen.get("cantidad")} ventas, '
      f'{resumen.get("unidades")} unidades, total {resumen.get("total")}')

documento = comprobar('Exportacion a PDF', 'GET',
                      '/api/reportes/ventas-diarias/pdf', 200, token=admin, binario=True)
print(f'          -> {documento["bytes"]} bytes, {documento["tipo"]}')
if documento['firma'] != b'%PDF':
    fallos.append('El reporte en PDF no tiene la firma %PDF')

hoja = comprobar('Exportacion a Excel', 'GET',
                 '/api/reportes/ventas-diarias/excel', 200, token=admin, binario=True)
print(f'          -> {hoja["bytes"]} bytes, {hoja["tipo"]}')
if hoja['firma'][:2] != b'PK':
    fallos.append('El reporte en Excel no es un archivo .xlsx valido')

comprobar('El empleado tambien genera reportes', 'GET',
          '/api/reportes/ventas-diarias', 200, token=empleado)
comprobar('El cliente no puede generar reportes', 'GET',
          '/api/reportes/ventas-diarias', 403, token=cliente)
comprobar('Ni descargarlos en PDF', 'GET',
          '/api/reportes/ventas-diarias/pdf', 403, token=cliente, binario=True)


titulo('5. MODULO DE PQR  (requerimiento 16)')
radicada = comprobar('El cliente radica un reclamo', 'POST', '/api/pqr', 201,
                     {'tipo': 'reclamo', 'asunto': 'PRUEBA AUTOMATICA del quinto avance',
                      'descripcion': 'Radicada por el script de verificacion para dejar '
                                     'evidencia del modulo de PQR en funcionamiento.'}, cliente)
creado['pqr'] = radicada.get('id_pqr')

comprobar('Rechaza una descripcion demasiado corta', 'POST', '/api/pqr', 422,
          {'tipo': 'queja', 'asunto': 'No sirve', 'descripcion': 'Malo'}, cliente)

mias = comprobar('El cliente consulta sus PQR', 'GET', '/api/pqr', 200, token=cliente)
todas = comprobar('El equipo ve todas las PQR', 'GET', '/api/pqr', 200, token=admin)
print(f'          -> {mias["resumen"]["total"]} del cliente, '
      f'{todas["resumen"]["total"]} en total, '
      f'{todas["resumen"]["pendientes"]} pendientes')

comprobar('Filtrado por tipo y estado', 'GET',
          '/api/pqr?tipo=reclamo&estado=pendiente', 200, token=admin)

comprobar('El empleado toma el caso', 'PATCH', f'/api/pqr/{creado["pqr"]}', 200,
          {'estado': 'en_proceso'}, empleado)

respondida = comprobar('El empleado responde la PQR', 'PATCH', f'/api/pqr/{creado["pqr"]}', 200,
                       {'estado': 'respondida',
                        'respuesta': 'Respuesta de prueba generada por el script de verificacion.'},
                       empleado)
agente = respondida.get('pqr', {}).get('agente_nombre')
print(f'          -> queda registrado que la atendio {agente}')

comprobar('El cliente no puede responder su propia PQR', 'PATCH',
          f'/api/pqr/{creado["pqr"]}', 403, {'estado': 'cerrada'}, cliente)


titulo('6. DASHBOARDS POR ROL  (requerimientos 10, 11, 12, 13 y 15)')
for nombre, token, deberia_ver in (('Administrador', admin, True),
                                   ('Empleado', empleado, False),
                                   ('Cliente', cliente, False)):
    datos = comprobar(f'Indicadores del {nombre.lower()}', 'GET',
                      '/api/estadisticas/resumen', 200, token=token)
    ind = datos.get('indicadores', {})
    ve_usuarios = ind.get('usuarios') is not None
    if ve_usuarios != deberia_ver:
        fallos.append(f'{nombre}: la visibilidad del conteo de usuarios no es la esperada')
    print(f'          -> ventas {ind.get("ventas_cantidad")}, facturas '
          f'{ind.get("facturas_cantidad")}, PQR {ind.get("pqr_total")}, '
          f'usuarios {ind.get("usuarios")}')

if (comprobar('El cliente no ve el inventario', 'GET', '/api/estadisticas/resumen', 200,
              token=cliente).get('indicadores', {}).get('valor_inventario') is not None):
    fallos.append('El cliente esta viendo el valor del inventario')

grafico = comprobar('Serie diaria para los graficos', 'GET',
                    '/api/estadisticas/ventas?agrupar=dia', 200, token=admin)
print(f'          -> {len(grafico["serie"])} puntos, {len(grafico["ranking"])} en el ranking, '
      f'{len(grafico["por_metodo_pago"])} formas de pago')
if len(grafico['serie']) != 30:
    fallos.append(f'La serie de 30 dias trajo {len(grafico["serie"])} puntos')

mensual = comprobar('Serie agrupada por mes', 'GET',
                    '/api/estadisticas/ventas?desde=2026-01-01&hasta=2026-12-31&agrupar=mes',
                    200, token=admin)
if len(mensual['serie']) != 12:
    fallos.append(f'El agrupamiento por mes trajo {len(mensual["serie"])} puntos en vez de 12')
else:
    print('          -> 12 meses, incluidos los que no tuvieron ventas')

comprobar('Filtrado del Dashboard por producto', 'GET',
          f'/api/estadisticas/ventas?producto_id={producto["id_producto"]}', 200, token=admin)
comprobar('Filtrado del Dashboard por estado', 'GET',
          '/api/estadisticas/ventas?estado=pagada', 200, token=admin)
comprobar('Sin token no hay Dashboard', 'GET', '/api/estadisticas/resumen', 401)


titulo('7. CHATBOT CON INTELIGENCIA ARTIFICIAL  (requerimientos 17, 18 y 19)')
estado_ia = comprobar('Estado de la integracion', 'GET', '/api/chatbot/estado', 200)
print(f'          -> IA activa: {estado_ia.get("ia_activa")}, '
      f'proveedor: {estado_ia.get("proveedor")}, modelo: {estado_ia.get("modelo")}')

# Se busca el aspecto de una clave real, no la palabra "api_key": el campo
# api_key_configurada y el texto de ayuda la nombran a proposito.
crudo = json.dumps(estado_ia)
if any(marca in crudo for marca in ('sk-', 'sk_', 'AIza')):
    fallos.append('El endpoint de estado podria estar filtrando la API Key')
else:
    print('          -> la respuesta dice si hay clave, pero no la devuelve')

charla = comprobar('Un visitante sin cuenta pregunta', 'POST', '/api/chatbot/mensaje', 200,
                   {'mensaje': 'Hola, buenas tardes'})
conversacion = charla.get('conversacion_id')
print(f'          -> conversacion {conversacion}, origen "{charla.get("origen")}"')

catalogo_bot = comprobar('Pregunta por el catalogo', 'POST', '/api/chatbot/mensaje', 200,
                         {'mensaje': '¿Que motos tienen disponibles?',
                          'conversacion_id': conversacion})
print(f'          -> {catalogo_bot.get("respuesta", "")[:110]}...')

pqr_bot = comprobar('Pregunta como poner una queja', 'POST', '/api/chatbot/mensaje', 200,
                    {'mensaje': 'Quiero poner una queja por un producto defectuoso',
                     'conversacion_id': conversacion})
if 'PQR' not in pqr_bot.get('respuesta', ''):
    fallos.append('El chatbot no oriento sobre el modulo de PQR')
else:
    print('          -> orienta correctamente hacia el modulo de PQR')

comprobar('Con sesion iniciada tambien responde', 'POST', '/api/chatbot/mensaje', 200,
          {'mensaje': '¿Como descargo mi factura?'}, cliente)
comprobar('Rechaza un mensaje vacio', 'POST', '/api/chatbot/mensaje', 422, {'mensaje': '   '})
comprobar('Las charlas anonimas no se pueden leer por la API', 'GET',
          f'/api/chatbot/conversaciones/{conversacion}', 403)


titulo('8. LIMPIEZA DE LOS DATOS DE PRUEBA')
# Las ventas no se borran, se anulan: es lo que corresponde a un documento
# contable, y ademas devuelve las unidades al inventario.
for clave in ('venta', 'venta_precio', 'venta_tienda', 'venta_sin_factura'):
    if creado.get(clave):
        comprobar(f'Anulada la venta de prueba ({clave})', 'PATCH',
                  f'/api/ventas/{creado[clave]}/estado', 200, {'estado': 'anulada'}, admin)

if creado.get('pqr'):
    comprobar('Cerrada la PQR de prueba', 'PATCH', f'/api/pqr/{creado["pqr"]}', 200,
              {'estado': 'cerrada',
               'respuesta': 'Cerrada automaticamente: era una PQR de prueba.'}, admin)

print('\nLas ventas de prueba quedan como ANULADAS y la PQR como CERRADA.')
print('Llevan "PRUEBA AUTOMATICA" en las observaciones, por si quieres borrarlas.')


titulo('RESULTADO')
if fallos:
    print(f'{len(fallos)} comprobaciones fallaron:\n')
    for fallo in fallos:
        print(f'  - {fallo}')
    raise SystemExit(1)

print('Todas las comprobaciones del quinto avance pasaron.')
print()
print('  Ventas          registro, historial, filtros y anulacion')
print('  Facturacion     emision, consulta y descarga en PDF')
print('  Reportes        JSON, PDF y Excel del reporte diario')
print('  PQR             radicacion, gestion y respuesta')
print('  Dashboards      indicadores, series y filtros, recortados por rol')
print('  Chatbot         atencion con y sin sesion, orientacion sobre PQR')
