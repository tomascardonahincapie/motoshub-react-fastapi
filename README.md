# Proyecto — Cuarto Avance: React + Vite + FastAPI + MySQL
### MotosHub / JHM Tech Solutions (Ficha 3406211)

Aplicación full-stack que integra un Frontend en **React + Vite + Tailwind CSS**
con un Backend en **Python + FastAPI** y una base de datos **MySQL**,
implementando autenticación JWT, hashing de contraseñas, validaciones en ambos
lados, control de roles, CRUD completo y paneles diferenciados para
Administrador, Empleado y Cliente.

Este avance **conserva por completo** la interfaz construida en los avances
anteriores (componentes reutilizables, Tailwind, registro, login, recuperación
de contraseña, validaciones, Navbar, Footer, carrusel y botón flotante de
WhatsApp) y **reemplaza el Backend de Node.js/Express por FastAPI**.

## Arquitectura

```
React + Vite  ──HTTP/JSON──►  FastAPI  ──SQLAlchemy──►  MySQL
 (puerto 5173)                (puerto 8000)             (puerto 3306)
```

```
proyecto/
├── frontend/   → React + Vite + Tailwind CSS
└── backend/    → Python + FastAPI + SQLAlchemy + MySQL
    ├── app/
    │   ├── core/       → configuración, conexión a la BD y seguridad (JWT + bcrypt)
    │   ├── models/     → modelos ORM (tablas de la base de datos)
    │   ├── schemas/    → esquemas Pydantic (validación de entrada y salida)
    │   ├── crud/       → consultas a la base de datos
    │   ├── routers/    → endpoints de la API
    │   ├── dependencias.py → protección de endpoints y control de roles
    │   ├── errores.py      → excepciones de negocio
    │   └── main.py         → aplicación, CORS y manejadores de error
    ├── database/schema.sql → script de creación de la base de datos
    ├── postman/            → colección de pruebas para Postman
    ├── scripts/            → script de evidencias de la API
    ├── tests/              → pruebas automáticas (pytest)
    └── requirements.txt
```

## Puesta en marcha

### 1. Base de datos

Con MySQL en ejecución (XAMPP, WAMP o servicio propio):

```bash
mysql -u root -p < backend/database/schema.sql
```

Crea la base `bd_jhm_tech_solutions` con las tablas `roles`, `permisos`,
`roles_permisos`, `usuarios`, `productos` y `servicios`, más el catálogo y los
usuarios de prueba.

> Si ya tenías la base de datos del avance anterior y no quieres recargar el
> catálogo, ejecuta estos dos scripts en su lugar:
>
> ```bash
> mysql -u root -p < backend/database/actualizar_imagenes.sql
> mysql -u root -p < backend/database/usuarios_demo.sql
> ```
>
> El primero agrega la columna `imagen` a la tabla `servicios` y apunta las
> fotos de productos y servicios a los archivos locales. El segundo agrega los
> usuarios Empleado y Cliente. Ninguno borra productos ni servicios.
> Los usuarios creados con el Backend de Node.js siguen funcionando, porque el
> formato del hash bcrypt es el mismo.

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

En Linux o macOS: `source venv/bin/activate` y `cp .env.example .env`.

Queda disponible en `http://localhost:8000` y la documentación automática en
**http://localhost:8000/docs**.

### 3. Frontend (React + Vite)

En otra terminal:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Abre `http://localhost:5173`.

## Usuarios de prueba

| Rol           | Correo                 | Contraseña   | Panel       |
|---------------|------------------------|--------------|-------------|
| Administrador | admin@jhmtech.com      | Admin1234    | `/admin`    |
| Empleado      | empleado@jhmtech.com   | Empleado123  | `/empleado` |
| Cliente       | cliente@jhmtech.com    | Cliente123   | `/cliente`  |

También puedes crear una cuenta nueva desde **Crear cuenta** en la pantalla de
inicio de sesión: se registra siempre con el rol Cliente.

## Endpoints de la API

| Método | Ruta                              | Acceso                         |
|--------|-----------------------------------|--------------------------------|
| POST   | `/api/usuarios/registro`          | Público                        |
| POST   | `/api/auth/register`              | Público (misma operación)      |
| POST   | `/api/auth/login`                 | Público                        |
| GET    | `/api/usuarios`                   | Administrador                  |
| GET    | `/api/usuarios/{id}`              | Administrador o el propio usuario |
| POST   | `/api/usuarios`                   | Administrador                  |
| PUT    | `/api/usuarios/{id}`              | Administrador o el propio usuario |
| PATCH  | `/api/usuarios/{id}/estado`       | Administrador                  |
| DELETE | `/api/usuarios/{id}`              | Administrador                  |
| GET    | `/api/productos`                  | Público                        |
| GET    | `/api/productos/{id}`             | Público                        |
| POST   | `/api/productos`                  | Administrador / Empleado       |
| PUT    | `/api/productos/{id}`             | Administrador / Empleado       |
| DELETE | `/api/productos/{id}`             | Administrador                  |
| GET    | `/api/servicios`                  | Público                        |
| GET    | `/api/servicios/{id}`             | Público                        |
| POST   | `/api/servicios`                  | Administrador / Empleado       |
| PUT    | `/api/servicios/{id}`             | Administrador / Empleado       |
| DELETE | `/api/servicios/{id}`             | Administrador                  |

Los endpoints protegidos requieren la cabecera:

```
Authorization: Bearer <token>
```

## Interfaz

El Frontend conserva todas las funcionalidades de los avances anteriores y suma
un rediseño completo:

- **Sistema de diseño propio** en `frontend/src/index.css`: paleta oscura por
  capas con acento naranja, tipografía Oswald + Inter, y clases reutilizables
  (`.tarjeta`, `.btn`, `.etiqueta`, `.campo`, `.metrica`) usadas en todo el sitio.
- **Efectos**: barra de navegación de vidrio que se compacta al desplazar,
  tarjetas que se elevan con borde degradado, zoom suave en las fotos,
  entradas escalonadas, esqueletos de carga y subrayado animado en el menú.
- **Menú de perfil**: al pulsar el avatar se despliega un panel con el nombre,
  el correo, el rol y el acceso directo al panel que corresponde
  (administrador, empleado o cliente) además de cerrar sesión.
- **Servicios como productos**: los servicios del taller ahora tienen imagen y
  se muestran en tarjetas idénticas a las de los productos, con su propia
  ficha de detalle.
- **Botón de compra por WhatsApp** en cada tarjeta y en cada ficha: abre el
  chat con el mensaje ya redactado (comprar un producto o agendar un servicio).
- **Panel de administración** con barra lateral, resumen de métricas
  (usuarios por rol, valor del inventario, stock más bajo), tablas con
  buscador y filtros, y formularios en ventana modal con vista previa de la
  imagen.

### Imágenes

Todas las fotos se sirven desde `frontend/public/img/`, no desde URLs externas,
así que cargan siempre incluso sin conexión a internet:

| Carpeta                 | Contenido                                    |
|-------------------------|----------------------------------------------|
| `public/img/productos/` | 15 fotos, una por producto del catálogo      |
| `public/img/servicios/` | 8 fotos, una por servicio del taller         |
| `public/img/motos/`     | 10 fotos del carrusel, a 1600x900 en WebP    |

El catálogo anterior tenía dos imágenes que devolvían 404 y cuatro repetidas
entre productos distintos; ahora cada producto y cada servicio tiene la suya.

Las fotos del carrusel se reemplazaron porque ocho de las diez medían solo
474 píxeles de ancho y se veían borrosas al mostrarlas a todo lo ancho. Las
nuevas están en WebP a 1600x900: se ven nítidas y entre las diez pesan 1,8 MB.

`backend/scripts/descargar_imagenes.py` documenta de dónde salió cada foto y
permite volver a descargarlas si hiciera falta.

Además, el componente `ImagenSegura` dibuja un marcador con el icono de la
categoría si alguna ruta falla, de modo que nunca aparece el icono de imagen
rota del navegador.

### Datos del negocio

El número de WhatsApp, el correo, el teléfono, la dirección y el horario están
centralizados en **`frontend/src/config.js`**. Cambia el número ahí una sola vez
y se actualiza en el botón flotante, en los botones de compra, en el pie de
página y en la página de contacto.

## Qué incluye este avance

- **Backend FastAPI** con modelos SQLAlchemy y esquemas Pydantic separados.
- **Conexión a MySQL** mediante variables de entorno (`.env`), nunca escritas
  en el código fuente.
- **Registro de clientes** conectado al formulario de React: valida, comprueba
  correo y documento duplicados, genera el hash y guarda en la base de datos.
- **Inicio de sesión con JWT**: verifica el hash de la contraseña y devuelve un
  token con el identificador, el correo y el rol del usuario.
- **Protección de endpoints** con dependencias de FastAPI que comprueban
  existencia del token, firma, expiración, usuario asociado y rol.
- **Control de roles** (Administrador, Empleado, Cliente) validado en el
  Backend: aunque el Frontend oculte una opción, la API también la impide.
- **CRUD completo** de usuarios, productos y servicios con los métodos
  **GET, POST, PUT, PATCH y DELETE**.
- **Estados activo/inactivo** para conservar la información histórica.
- **Validaciones en React y en FastAPI**, con las mismas reglas en ambos lados.
- **Paneles diferenciados** de Administrador, Empleado y Cliente.
- **Navbar con el usuario autenticado** y cierre de sesión.
- **Botón flotante de WhatsApp** conservado, independiente del Backend.
- **Documentación automática Swagger** en `/docs`.
- **Colección de Postman** con 33 peticiones listas para ejecutar.
- **40 pruebas automáticas** que recorren toda la API (`pytest`).

## Verificación realizada

- `pytest` → 40 pruebas en verde (registro, login, JWT, roles, CRUD,
  validaciones y respuestas de error).
- Recorrido completo de la API contra **MySQL real** con
  `python scripts/verificar_api.py`.
- Inicio de sesión y paneles comprobados en el navegador con el Frontend de
  Vite consumiendo FastAPI.

## Notas para la entrega

- Toma las capturas de pantalla de Postman y de Swagger (`/docs`) como
  evidencia de los métodos GET, POST, PUT, PATCH y DELETE.
- El archivo `.env` no se incluye en el repositorio; se entrega `.env.example`
  para que el instructor lo copie.
- Cambia el número de WhatsApp de ejemplo en `frontend/src/components/WhatsAppButton.jsx`
  por el real del negocio.
- Consulta `backend/README.md` para el detalle de la instalación, la estructura
  del Backend y la solución de problemas frecuentes.
