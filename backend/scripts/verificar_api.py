"""Recorrido completo de la API: sirve como evidencia de funcionamiento.

Recorre registro, login con JWT, proteccion de endpoints, control de roles y
el CRUD de usuarios, productos y servicios usando los metodos GET, POST, PUT,
PATCH y DELETE.

Uso (con el servidor levantado con uvicorn):
    python scripts/verificar_api.py
"""

import json
import urllib.error
import urllib.request

BASE = 'http://127.0.0.1:8000'
fallos = []


def peticion(metodo, ruta, cuerpo=None, token=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or '{}')


def comprobar(descripcion, metodo, ruta, esperado, cuerpo=None, token=None):
    estado, datos = peticion(metodo, ruta, cuerpo, token)
    ok = estado == esperado
    marca = 'OK  ' if ok else 'FALLA'
    if not ok:
        fallos.append(f'{descripcion} -> esperado {esperado}, recibido {estado}: {datos}')
    resumen = datos.get('message') or datos.get('codigo') or ''
    print(f'{marca} {metodo:6} {ruta:34} {estado}  {descripcion}')
    if resumen:
        print(f'          -> {resumen}')
    return datos


print('=' * 78)
print('1. REGISTRO DE CLIENTE  (POST, publico)')
print('=' * 78)
nuevo = {
    'nombres': 'Tomas', 'apellidos': 'Cardona', 'tipo_documento': 'CC',
    'numero_documento': '1035998877', 'direccion': 'Calle 10 #45-20',
    'telefono': '3001234567', 'email': 'tomas.prueba@correo.com', 'password': 'Clave123',
}
peticion('DELETE', '/api/nada')  # ruido: ruta inexistente
creado = comprobar('Registro de un cliente nuevo', 'POST', '/api/usuarios/registro', 201, nuevo)
comprobar('Correo duplicado rechazado', 'POST', '/api/usuarios/registro', 409, nuevo)
comprobar('Contrasena debil rechazada', 'POST', '/api/usuarios/registro', 422,
          {**nuevo, 'email': 'otro@correo.com', 'numero_documento': '1111111111', 'password': 'abc'})

print()
print('=' * 78)
print('2. INICIO DE SESION Y JWT')
print('=' * 78)
sesion_admin = comprobar('Login del administrador', 'POST', '/api/auth/login', 200,
                         {'email': 'admin@jhmtech.com', 'password': 'Admin1234'})
token_admin = sesion_admin['token']
print(f'          -> token JWT: {token_admin[:45]}...')
print(f"          -> usuario: {sesion_admin['usuario']['nombres']} "
      f"({sesion_admin['usuario']['nombre_rol']})")

token_empleado = comprobar('Login del empleado', 'POST', '/api/auth/login', 200,
                           {'email': 'empleado@jhmtech.com', 'password': 'Empleado123'})['token']
token_cliente = comprobar('Login del cliente', 'POST', '/api/auth/login', 200,
                          {'email': 'cliente@jhmtech.com', 'password': 'Cliente123'})['token']
comprobar('Credenciales invalidas', 'POST', '/api/auth/login', 401,
          {'email': 'admin@jhmtech.com', 'password': 'ClaveMala1'})

print()
print('=' * 78)
print('3. PROTECCION DE ENDPOINTS Y CONTROL DE ROLES')
print('=' * 78)
comprobar('Sin token', 'GET', '/api/usuarios', 401)
comprobar('Token manipulado', 'GET', '/api/usuarios', 403, token='abc.def.ghi')
comprobar('Cliente intentando listar usuarios', 'GET', '/api/usuarios', 403, token=token_cliente)
comprobar('Empleado intentando listar usuarios', 'GET', '/api/usuarios', 403, token=token_empleado)
lista = comprobar('Administrador lista usuarios', 'GET', '/api/usuarios', 200, token=token_admin)
print(f"          -> {len(lista['usuarios'])} usuarios en la base de datos")
print(f"          -> password expuesto: {'password' in lista['usuarios'][0]}")

print()
print('=' * 78)
print('4. CRUD DE USUARIOS  (GET, POST, PUT, PATCH, DELETE)')
print('=' * 78)
id_nuevo = creado['usuario']['id_usuario']
comprobar('Consulta individual', 'GET', f'/api/usuarios/{id_nuevo}', 200, token=token_admin)
comprobar('Cliente consultando el perfil de otro', 'GET', f'/api/usuarios/{id_nuevo}', 403, token=token_cliente)
comprobar('Crear empleado como administrador', 'POST', '/api/usuarios', 201, token=token_admin,
          cuerpo={**nuevo, 'email': 'nuevo.empleado@correo.com',
                  'numero_documento': '1022334455', 'rol_id': 2})
comprobar('Actualizar usuario', 'PUT', f'/api/usuarios/{id_nuevo}', 200, token=token_admin,
          cuerpo={'nombres': 'Tomas Andres', 'apellidos': 'Cardona Hincapie',
                  'direccion': 'Carrera 80 #20-15', 'telefono': '3009998877',
                  'email': 'tomas.prueba@correo.com', 'rol_id': 3})
comprobar('Cambiar estado a inactivo', 'PATCH', f'/api/usuarios/{id_nuevo}/estado', 200,
          token=token_admin, cuerpo={'estado': 'inactivo'})
comprobar('Login bloqueado por cuenta inactiva', 'POST', '/api/auth/login', 403,
          {'email': 'tomas.prueba@correo.com', 'password': 'Clave123'})
comprobar('Reactivar usuario', 'PATCH', f'/api/usuarios/{id_nuevo}/estado', 200,
          token=token_admin, cuerpo={'estado': 'activo'})
comprobar('Eliminar usuario', 'DELETE', f'/api/usuarios/{id_nuevo}', 200, token=token_admin)
comprobar('Usuario ya eliminado', 'GET', f'/api/usuarios/{id_nuevo}', 404, token=token_admin)

print()
print('=' * 78)
print('5. CRUD DE PRODUCTOS')
print('=' * 78)
catalogo = comprobar('Catalogo publico', 'GET', '/api/productos', 200)
print(f"          -> {len(catalogo['productos'])} productos; el primero: "
      f"{catalogo['productos'][0]['nombre']} (${catalogo['productos'][0]['precio']})")
comprobar('Crear producto sin token', 'POST', '/api/productos', 401,
          {'nombre': 'Prueba', 'precio': 1000})
comprobar('Cliente creando producto', 'POST', '/api/productos', 403,
          {'nombre': 'Prueba', 'precio': 1000}, token=token_cliente)
producto = comprobar('Empleado crea producto', 'POST', '/api/productos', 201, token=token_empleado,
                     cuerpo={'nombre': 'Guantes Racing Pro', 'descripcion': 'Cuero reforzado.',
                             'precio': 145000, 'stock': 12, 'categoria': 'Accesorios', 'imagen': ''})
id_producto = producto['id_producto']
comprobar('Actualizar producto', 'PUT', f'/api/productos/{id_producto}', 200, token=token_empleado,
          cuerpo={'nombre': 'Guantes Racing Pro 2026', 'descripcion': 'Cuero reforzado.',
                  'precio': 159000, 'stock': 10, 'categoria': 'Accesorios',
                  'imagen': '', 'estado': 'activo'})
comprobar('Consultar producto', 'GET', f'/api/productos/{id_producto}', 200)
comprobar('Empleado eliminando producto', 'DELETE', f'/api/productos/{id_producto}', 403,
          token=token_empleado)
comprobar('Administrador elimina producto', 'DELETE', f'/api/productos/{id_producto}', 200,
          token=token_admin)

print()
print('=' * 78)
print('6. CRUD DE SERVICIOS')
print('=' * 78)
servicios = comprobar('Catalogo publico de servicios', 'GET', '/api/servicios', 200)
print(f"          -> {len(servicios['servicios'])} servicios")
servicio = comprobar('Empleado crea servicio', 'POST', '/api/servicios', 201, token=token_empleado,
                     cuerpo={'nombre': 'Sincronizacion de inyeccion',
                             'descripcion': 'Ajuste electronico.', 'precio': 120000,
                             'duracion_minutos': 60})
id_servicio = servicio['id_servicio']
comprobar('Actualizar servicio', 'PUT', f'/api/servicios/{id_servicio}', 200, token=token_empleado,
          cuerpo={'nombre': 'Sincronizacion de inyeccion premium',
                  'descripcion': 'Ajuste electronico.', 'precio': 145000,
                  'duracion_minutos': 75, 'estado': 'activo'})
comprobar('Administrador elimina servicio', 'DELETE', f'/api/servicios/{id_servicio}', 200,
          token=token_admin)

print()
print('=' * 78)
print('7. DOCUMENTACION AUTOMATICA')
print('=' * 78)
import urllib.request as u
with u.urlopen(BASE + '/docs') as r:
    print(f'OK   GET    /docs                              {r.status}  Swagger UI disponible')
with u.urlopen(BASE + '/openapi.json') as r:
    esquema = json.loads(r.read().decode())
    print(f"OK   GET    /openapi.json                      {r.status}  "
          f"{len(esquema['paths'])} rutas documentadas")

print()
print('=' * 78)
if fallos:
    print(f'RESULTADO: {len(fallos)} comprobaciones fallidas')
    for f in fallos:
        print('  -', f)
else:
    print('RESULTADO: todas las comprobaciones pasaron contra MySQL')
print('=' * 78)
