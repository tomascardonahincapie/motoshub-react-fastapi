# Proyecto — Quinto Avance: React + Vite + FastAPI + MySQL + IA

> **La aplicación está en línea:**
> Sitio → https://motoshub-react-fastapi.vercel.app
> API → https://motoshub-react-fastapi.onrender.com/docs

### MotosHub / JHM Tech Solutions (Ficha 3406211)

Aplicación full-stack que integra un Frontend en **React + Vite + Tailwind CSS**
con un Backend en **Python + FastAPI** y una base de datos **MySQL**.

Sobre la base construida en los avances anteriores —autenticación JWT, hashing
de contraseñas, control de roles, CRUD y paneles diferenciados—, el quinto
avance añade la **gestión comercial completa**:

| Módulo | Qué hace |
|---|---|
| **Ventas** | Registro de ventas de productos y servicios, con detalle, IVA y movimiento de inventario |
| **Historial** | Consulta filtrable por fecha, cliente, artículo, estado, forma de pago y valor |
| **Facturación** | Emisión de facturas de venta y descarga en PDF |
| **Reportes** | Reporte diario de ventas en pantalla, en PDF y en Excel |
| **Dashboards** | Indicadores, gráfico de barras y gráfico lineal, diferenciados por rol |
| **PQR** | Peticiones, quejas, reclamos y sugerencias, con radicado y seguimiento |
| **Chatbot** | Asistente de atención al cliente integrado con Inteligencia Artificial |
| **Despliegue** | Configuración lista para producción (ver [`DESPLIEGUE.md`](DESPLIEGUE.md)) |

Todo se construyó **sobre el proyecto existente**: no se rehízo la interfaz ni
se cambió la arquitectura. Los componentes, el sistema de diseño, el registro,
el inicio de sesión, la recuperación de contraseña, el catálogo, el Navbar, el
Footer, el carrusel y el botón de WhatsApp siguen siendo los mismos.

## Arquitectura

```
React + Vite  ──HTTP/JSON──►  FastAPI  ──SQLAlchemy──►  MySQL
 (puerto 5173)                (puerto 8000)             (puerto 3306)
                                  │
                                  └──HTTPS──►  Servicio de IA (chatbot)
```

El Frontend nunca habla con el servicio de IA: la petición sale del Backend,
que es donde vive la API Key. El navegador no llega a saber cuál es.

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
    │   ├── main.py         → aplicación, CORS y manejadores de error
    │   └── servicios/      → generación de PDF y Excel, e integración con la IA
    ├── database/           → scripts SQL (esquema completo y migración)
    ├── postman/            → colección de pruebas para Postman
    ├── scripts/            → verificación de la API y datos de demostración
    ├── tests/              → pruebas automáticas (pytest)
    └── requirements.txt
```

Dentro de `backend/app/`:

| Carpeta | Qué contiene |
|---|---|
| `core/` | Configuración, conexión a la base de datos, seguridad y correo |
| `models/` | Modelos ORM: una clase por tabla |
| `schemas/` | Esquemas Pydantic: validación de lo que entra y forma de lo que sale |
| `crud/` | Consultas y reglas de negocio |
| `routers/` | Endpoints agrupados por módulo |
| `servicios/` | `pdf.py`, `excel.py`, `reportes.py` e `ia.py` |

La separación entre **modelos** (`models/`) y **esquemas** (`schemas/`) se
mantiene en todo el proyecto: los primeros describen la tabla, los segundos
lo que viaja por la API.

## Puesta en marcha

### 1. Base de datos

Con MySQL en ejecución (XAMPP, WAMP o servicio propio):

```bash
mysql -u root -p < backend/database/schema.sql
```

Crea la base `bd_jhm_tech_solutions` con las **14 tablas** del proyecto, más el
catálogo y los usuarios de prueba:

| Del cuarto avance | Del quinto avance |
|---|---|
| `roles`, `permisos`, `roles_permisos` | `ventas`, `detalle_ventas` |
| `usuarios`, `tokens_recuperacion` | `facturas`, `pqr` |
| `productos`, `servicios` | `detalle_facturas`, `conversaciones`, `mensajes` |

> **Si ya tienes la base del cuarto avance con datos, no ejecutes
> `schema.sql`**: borraría el catálogo. Usa la migración, que solo agrega lo
> nuevo:
>
> ```bash
> mysql -u root -p bd_jhm_tech_solutions < backend/database/quinto_avance.sql
> ```
>
> Crea las seis tablas nuevas y registra los permisos de los módulos añadidos.
> No toca usuarios, productos ni servicios, y se puede ejecutar varias veces
> sin riesgo.

#### Datos de demostración

Los Dashboards y los reportes no se pueden evidenciar con la base vacía. Este
script crea un historial repartido en las últimas semanas, pasando por el mismo
código que usa la API:

```bash
cd backend
python scripts/datos_demo.py            # crear
python scripts/datos_demo.py --limpiar  # borrar solo lo que creó
```

Genera unas 55 ventas con su factura y 5 PQR en distintos estados. Al terminar
repone el inventario a los valores que tenía, para que el catálogo siga
mostrando disponibilidad.

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

### 4. Chatbot con Inteligencia Artificial (opcional)

El chatbot **funciona sin configurar nada**: responde con un motor de reglas
que consulta la misma base de datos. Para que responda con IA, añade en
`backend/.env`:

```env
IA_PROVEEDOR=anthropic        # o "openai"
IA_API_KEY=tu-clave-aqui
```

`openai` sirve también para cualquier proveedor con API compatible con
`/chat/completions` (Groq, OpenRouter, DeepSeek, Together...) indicando
`IA_URL_BASE`.

Comprueba el resultado en `http://localhost:8000/api/chatbot/estado`.

> La API Key va **solo** en el `.env` del Backend, que está en `.gitignore`.
> Nunca en el código, nunca en el repositorio y nunca en una variable `VITE_`:
> todo lo que empieza por `VITE_` acaba dentro del JavaScript que descarga
> cualquier visitante.

### 5. Despliegue en producción

Ver [`DESPLIEGUE.md`](DESPLIEGUE.md) para el paso a paso en Railway, las
variables de entorno de cada servicio y la configuración de CORS.

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
| POST   | `/api/auth/recuperar-password`    | Público                        |
| GET    | `/api/auth/restablecer-password/{token}` | Público                 |
| POST   | `/api/auth/restablecer-password`  | Público                        |
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

### Módulos del quinto avance

| Método | Ruta                                   | Acceso                     |
|--------|----------------------------------------|----------------------------|
| POST   | `/api/ventas`                          | Cualquier usuario con sesión |
| GET    | `/api/ventas`                          | Todos (el cliente ve solo las suyas) |
| GET    | `/api/ventas/{id}`                     | Su dueño, Administrador o Empleado |
| PATCH  | `/api/ventas/{id}/estado`              | Administrador / Empleado   |
| POST   | `/api/facturas`                        | Administrador / Empleado   |
| GET    | `/api/facturas`                        | Todos (el cliente ve solo las suyas) |
| GET    | `/api/facturas/{id}`                   | Su dueño, Administrador o Empleado |
| GET    | `/api/facturas/{id}/pdf`               | Su dueño, Administrador o Empleado |
| PATCH  | `/api/facturas/{id}/estado`            | Administrador / Empleado   |
| GET    | `/api/reportes/ventas-diarias`         | Administrador / Empleado   |
| GET    | `/api/reportes/ventas-diarias/pdf`     | Administrador / Empleado   |
| GET    | `/api/reportes/ventas-diarias/excel`   | Administrador / Empleado   |
| POST   | `/api/pqr`                             | Cualquier usuario con sesión |
| GET    | `/api/pqr`                             | Todos (el cliente ve solo las suyas) |
| GET    | `/api/pqr/{id}`                        | Su dueño, Administrador o Empleado |
| PATCH  | `/api/pqr/{id}`                        | Administrador / Empleado   |
| GET    | `/api/estadisticas/resumen`            | Todos (recortado por rol)  |
| GET    | `/api/estadisticas/ventas`             | Todos (recortado por rol)  |
| GET    | `/api/chatbot/estado`                  | Público                    |
| POST   | `/api/chatbot/mensaje`                 | Público (mejor con sesión) |
| GET    | `/api/chatbot/conversaciones/{id}`     | Su dueño, Administrador o Empleado |

**45 endpoints en total.** Donde dice «el cliente ve solo las suyas», el
recorte lo hace FastAPI a partir del rol del token: el Frontend llama a la
misma ruta para los tres roles y recibe respuestas distintas.

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

### Catálogo

En la tabla `productos` solo hay **motocicletas**: el negocio vende motos y
todo lo que se hace sobre ellas está en `servicios`. La categoría de cada moto
indica su tipo (Deportivas, Naked, Adventure, Clásicas, Urbanas) y de ahí sale
el filtro del catálogo.

Si ya tienes la base con los accesorios y repuestos del avance anterior:

```bash
mysql -u root -p bd_jhm_tech_solutions < backend/database/catalogo_solo_motos.sql
```

Retira lo que no es una moto y agrega seis modelos más. Las ventas ya
registradas no se pierden: `detalle_ventas` guarda una copia del nombre y del
precio de cada artículo vendido.

### Imágenes

Las fotos del catálogo están en `frontend/public/img/`. Las de Wikimedia
Commons llevan licencia CC BY-SA, que obliga a citar autor y licencia: eso se
hace en [`frontend/public/img/CREDITOS.md`](frontend/public/img/CREDITOS.md).


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
- **Recuperación de contraseña** con enlace de un solo uso y vigencia de 30
  minutos. En la base de datos se guarda solo el hash SHA-256 del token.
  El endpoint es público, así que lleva topes: **3 enlaces por correo cada 15
  minutos**, **10 solicitudes por equipo cada hora**, y mientras el enlace
  anterior siga vigente no se envía otro correo. Sin eso, pulsar el botón en
  bucle llena el buzón de cualquier persona registrada.
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
- **Documentación automática Swagger** en `/docs`.

### Añadido en el quinto avance

- **Módulo de ventas**: registro de productos y servicios en una misma
  operación, con subtotal, descuentos, IVA, total, forma de pago y estado.
  Los precios se leen del catálogo, nunca de la petición.
- **Detalle de venta** que guarda una copia del nombre y del precio del
  momento: si el artículo cambia de precio o se borra, el histórico no miente.
- **Movimiento de inventario**: vender descuenta unidades y anular las
  devuelve.
- **Historial de ventas** filtrable por fecha, cliente, producto, servicio,
  estado, forma de pago, valor y texto libre.
- **Facturación**: la factura copia los datos del cliente al emitirse, se
  consulta por número, cliente o fecha, y se descarga en **PDF**.
- **Reporte diario de ventas** en tres formatos (**JSON, PDF y Excel**) a
  partir de un único cálculo, para que nunca discrepen entre sí.
- **Dashboards por rol** con tarjetas de indicadores, **gráfico de barras** y
  **gráfico lineal**, filtrables por fecha, agrupación, estado, forma de pago,
  artículo y cliente.
- **Gráficos en SVG propio**, sin añadir ninguna librería al proyecto.
- **Módulo de PQR** con número de radicado, cuatro estados y respuesta del
  equipo, visible para el cliente en su panel.
- **Chatbot con Inteligencia Artificial** que responde sobre el catálogo real,
  orienta el proceso de compra y encauza las PQR. Funciona con o sin sesión
  iniciada, y sigue atendiendo con su motor de reglas si no hay API Key o si
  el proveedor falla.
- **API Key protegida**: vive solo en el `.env` del Backend, nunca llega al
  navegador y el endpoint de estado jamás la devuelve.
- **Carrito de compras** en el sitio público, con confirmación que registra la
  venta real y entrega la factura.
- **Colección de Postman** con 86 peticiones y 97 comprobaciones que pasan
  enteras, una y otra vez, sin dejar rastro en la base.
- **133 pruebas automáticas** que recorren toda la API (`pytest`).
- **Configuración de despliegue** para Railway y para plataformas con Docker.

## Verificación realizada

- `pytest` → **133 pruebas en verde**: registro, login, JWT, roles, CRUD,
  validaciones, ventas, stock, facturación, reportes en PDF y Excel, PQR,
  Dashboards por rol y chatbot (con el proveedor de IA simulado).
- Recorrido de la API contra **MySQL real**:

  ```bash
  python scripts/verificar_api.py             # avance 4
  python scripts/verificar_quinto_avance.py   # avance 5
  ```

  El segundo script deja anuladas las ventas que crea, para no ensuciar el
  historial.
- Compra completa hecha desde el navegador: catálogo → carrito → confirmación
  → factura en PDF, comprobando después en MySQL que la venta, la factura y el
  descuento de stock quedaron registrados.
- PDF y Excel abiertos y revisados: contenido, totales y formato.

## Notas para la entrega

- Toma las capturas de pantalla de Postman y de Swagger (`/docs`) como
  evidencia de los métodos GET, POST, PUT, PATCH y DELETE.
- El archivo `.env` no se incluye en el repositorio; se entrega `.env.example`
  para que el instructor lo copie.
- Cambia el número de WhatsApp de ejemplo en `frontend/src/components/WhatsAppButton.jsx`
  por el real del negocio.
- Consulta `backend/README.md` para el detalle de la instalación, la estructura
  del Backend y la solución de problemas frecuentes.
