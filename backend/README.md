# Backend — FastAPI + SQLAlchemy + MySQL

API REST del cuarto avance del proyecto **MotosHub**. Sustituye al Backend de
Node.js/Express conservando exactamente el mismo contrato HTTP, de modo que el
Frontend de React sigue funcionando sin cambios de diseño.

---

## 1. Requisitos

- Python 3.11 o superior
- MySQL 5.7 / 8.x (XAMPP, WAMP o servicio propio)

## 2. Instalación

```bash
cd backend

# Entorno virtual
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux / macOS

# Dependencias
pip install -r requirements.txt

# Variables de entorno
copy .env.example .env         # Windows
# cp .env.example .env         # Linux / macOS
```

Edita `.env` con las credenciales de tu MySQL y una clave secreta propia para
el JWT.

## 3. Base de datos

```bash
mysql -u root -p < database/schema.sql
```

También puedes importar ese archivo desde phpMyAdmin o MySQL Workbench. El
script crea:

| Tabla            | Contenido                                                    |
|------------------|--------------------------------------------------------------|
| `roles`          | Administrador, Empleado, Cliente                             |
| `permisos`       | Permisos por módulo                                          |
| `roles_permisos` | Relación N a N entre roles y permisos                        |
| `usuarios`       | Datos del formulario de registro + rol, estado y hash        |
| `productos`      | Catálogo de la tienda (15 productos de ejemplo)              |
| `servicios`      | Servicios del taller (8 de ejemplo, con imagen)              |

La tabla `usuarios` conserva todos los campos del formulario: nombres,
apellidos, tipo y número de documento, dirección, teléfono, correo, contraseña
(**solo el hash**), rol y estado.

Si ya tienes la base del avance anterior y no quieres recargar el catálogo,
ejecuta solo estos dos scripts:

```bash
mysql -u root -p < database/actualizar_imagenes.sql
mysql -u root -p < database/usuarios_demo.sql
```

`actualizar_imagenes.sql` agrega la columna `imagen` a `servicios` y apunta las
fotos de productos y servicios a los archivos de `frontend/public/img/`. Es
seguro ejecutarlo varias veces y no borra registros.

`usuarios_demo.sql` agrega los usuarios Empleado y Cliente de prueba.

## 4. Ejecución

```bash
uvicorn app.main:app --reload
```

| Dirección                          | Contenido                          |
|------------------------------------|------------------------------------|
| http://localhost:8000              | Información del servicio           |
| http://localhost:8000/salud        | Estado de la conexión a la BD      |
| http://localhost:8000/docs         | **Swagger UI** (documentación)     |
| http://localhost:8000/redoc        | Documentación alternativa          |

## 5. Estructura

```
app/
├── core/
│   ├── configuracion.py   Lee el .env con pydantic-settings
│   ├── base_datos.py      Motor y sesiones de SQLAlchemy
│   └── seguridad.py       Hash bcrypt y firma/verificación del JWT
├── models/                Modelos ORM: Rol, Permiso, Usuario, Producto, Servicio
├── schemas/               Esquemas Pydantic de validación y de respuesta
├── crud/                  Consultas a la base de datos
├── routers/               auth, usuarios, productos, servicios
├── dependencias.py        Sesión de BD, verificación del JWT y control de roles
├── errores.py             Excepciones de negocio con su código y estado HTTP
├── middlewares.py         Registro de peticiones y cabeceras de seguridad
└── main.py                Aplicación, CORS, routers y manejadores de error
```

La separación entre **models** (base de datos) y **schemas** (validación de la
API) es intencional: el modelo describe la tabla, el esquema describe lo que la
API acepta y devuelve. Así la contraseña existe en el modelo pero nunca aparece
en ningún esquema de respuesta.

## 6. Seguridad

**Contraseñas.** Se almacena únicamente el hash bcrypt (12 rondas), generado en
`app/core/seguridad.py`. La contraseña original nunca llega a la base de datos.

> Se usa la librería `bcrypt` directamente y no `passlib`, porque `passlib`
> 1.7.4 es incompatible con `bcrypt` 5.x y falla al iniciar. Los hashes son los
> mismos, así que los usuarios creados con el Backend anterior de Node.js
> siguen pudiendo iniciar sesión.

**JWT.** Al iniciar sesión se firma un token con el identificador, el correo,
el rol del usuario y una fecha de expiración (8 horas por defecto). El Frontend
lo envía en cada petición protegida:

```
Authorization: Bearer <token>
```

La dependencia `usuario_actual` comprueba existencia del token, firma,
expiración, usuario asociado y que la cuenta siga activa. `ExigirRoles`
restringe además por rol.

**Variables de entorno.** Credenciales de MySQL y clave del JWT viven en
`.env`, que está excluido en `.gitignore`.

## 7. Formato de las respuestas

Éxito:

```json
{ "ok": true, "message": "Usuario creado correctamente", "id_usuario": 7 }
```

Error:

```json
{
  "ok": false,
  "message": "El correo ya está registrado",
  "codigo": "conflicto_de_negocio",
  "errors": { "email": "Este correo ya está registrado" }
}
```

El campo `errors` permite a React resaltar el input concreto que falló, y
`codigo` le permite reaccionar (por ejemplo, cerrar la sesión cuando el token
dejó de ser válido) sin depender del texto del mensaje.

| Código HTTP | Situación                                        |
|-------------|--------------------------------------------------|
| 400         | Error de negocio                                 |
| 401         | Falta el token o las credenciales son inválidas  |
| 403         | Token inválido, cuenta inactiva o rol sin permiso|
| 404         | Recurso no encontrado                            |
| 409         | Correo o documento duplicado                     |
| 422         | Datos que no cumplen las validaciones            |

## 8. Pruebas

### Automáticas

```bash
pytest
```

40 pruebas que cubren registro, duplicados, validaciones, login, JWT,
protección de endpoints, control de roles, el CRUD de usuarios, productos y
servicios, y el manejo de las imágenes del catálogo. Usan SQLite en memoria, así que no necesitan que MySQL esté
encendido.

### Evidencia contra MySQL

Con el servidor levantado:

```bash
python scripts/verificar_api.py
```

Recorre la API real e imprime el método, la ruta, el código de estado y el
mensaje de cada operación. Sirve como evidencia de los métodos GET, POST, PUT,
PATCH y DELETE.

### Postman

Importa `postman/MotosHub_API.postman_collection.json`. Contiene 33 peticiones
organizadas en seis carpetas. Ejecuta primero los tres *logins*: guardan los
tokens en variables de colección y el resto de peticiones los reutilizan
automáticamente.

## 9. Problemas frecuentes

**`Can't connect to MySQL server`**
MySQL no está encendido. Arranca el servicio desde el panel de XAMPP/WAMP y
comprueba `http://localhost:8000/salud`.

**`Unknown database 'bd_jhm_tech_solutions'`**
Falta ejecutar `database/schema.sql`.

**`Access denied for user 'root'@'localhost'`**
Revisa `DB_USER` y `DB_PASSWORD` en tu `.env`.

**El Frontend muestra "No fue posible conectar con el servidor"**
Levanta `uvicorn` y confirma que `frontend/.env` apunta a
`http://localhost:8000/api`.

**Error de CORS en el navegador**
Añade la URL desde la que sirves el Frontend a `ORIGENES_PERMITIDOS` en `.env`.
