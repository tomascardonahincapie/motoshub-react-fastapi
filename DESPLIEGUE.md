# Despliegue de MotosHub

Guía para poner el proyecto en producción: **React + Vite → FastAPI → MySQL**.

Se describe el despliegue en **Railway**, que es la plataforma recomendada en
el quinto avance, pero el proyecto no depende de ella: los mismos pasos sirven
en Render, Fly.io o un VPS, porque toda la configuración va por variables de
entorno.

---

## Lo que hay que desplegar

| Servicio | Qué es | Cómo arranca |
|---|---|---|
| **Base de datos** | MySQL | La crea la plataforma |
| **Backend** | FastAPI (carpeta `backend/`) | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Frontend** | React + Vite compilado (carpeta `frontend/`) | `npm run build` y luego `node servidor.js` |

Los archivos de configuración ya están en el repositorio:

- `backend/railway.json` y `frontend/railway.json` — builder y comando de arranque
- `render.yaml` — los dos servicios de Render en un solo Blueprint
- `backend/Procfile` y `frontend/Procfile` — lo mismo para plataformas tipo Heroku
- `backend/Dockerfile` y `frontend/Dockerfile` — alternativa para plataformas con Docker
- `frontend/servidor.js` — servidor estático del Frontend ya compilado

### Por qué el Frontend necesita un servidor propio

Vite solo trae servidor en modo desarrollo. En producción hay que servir la
carpeta `dist` cumpliendo dos condiciones:

1. Escuchar en el puerto que asigne la plataforma (variable `PORT`).
2. Devolver `index.html` en cualquier ruta que no corresponda a un archivo,
   porque React Router resuelve las rutas en el navegador. Sin eso, entrar
   directamente a `/admin` o recargar esa página daría **404**.

De eso se encarga `frontend/servidor.js`, escrito solo con módulos de Node
para no añadir dependencias.

---

## Paso 1 · Subir el proyecto a GitHub

Railway despliega desde un repositorio. Si el proyecto ya está subido, basta
con hacer `git push` de los últimos cambios.

> **Antes de subir nada, comprueba que los archivos `.env` no están en el
> repositorio.** Deben aparecer en `.gitignore` (ya lo están) y solo se
> versionan los `.env.example`, que no llevan valores reales.
>
> ```bash
> git ls-files | grep -E "(^|/)\.env$"
> ```
>
> Ese comando no debe devolver nada.

---

## Paso 2 · Crear la base de datos

1. En [railway.app](https://railway.app) crea un proyecto nuevo.
2. **Create** → **Database** → **Add MySQL**.
3. Abre el servicio MySQL, pestaña **Variables**, y copia el valor de
   `MYSQL_URL`. Tiene esta forma:

   ```
   mysql://root:CLAVE@monorail.proxy.rlwy.net:33060/railway
   ```

### Si la base va en Aiven

[aiven.io](https://aiven.io) tiene plan gratuito de **MySQL**, que es raro de
encontrar: la mayoría de plataformas solo regalan PostgreSQL. Sirve de sobra
para este proyecto y es la pareja natural de un Backend en Render, que no trae
base de datos propia.

1. **Create service** → **MySQL** → plan **Free**.
2. Espera a que el estado pase a *Running* (tarda un par de minutos).
3. En **Overview**, copia el **Service URI**. Viene así:

   ```
   mysql://avnadmin:CLAVE@mysql-xxxx-motoshub.a.aivencloud.com:23456/defaultdb?ssl-mode=REQUIRED
   ```

Pégala tal cual en `DATABASE_URL`. El código le quita el `ssl-mode`, que es
sintaxis del cliente de MySQL y PyMySQL no sabe recibir —pegada sin limpiar, el
servicio ni siquiera arranca—. La conexión sigue yendo cifrada: cuando no se le
indica nada, PyMySQL intenta TLS igualmente si el servidor lo ofrece, y Aiven
siempre lo ofrece.

Tres detalles propios de Aiven:

- El usuario es `avnadmin`, la base de entrada se llama `defaultdb` y el puerto
  no es el 3306. Si prefieres el nombre del proyecto, créala en la pestaña
  **Databases** de la consola y cambia el final de la URI.
- El plan gratuito **no hace copias de seguridad**. Para una entrega académica
  da igual, pero no pongas ahí nada que duela perder.
- Si quieres además *verificar* el certificado del servidor y no solo cifrar,
  descarga el **CA Certificate** de la consola y añádelo a la URL:
  `...?ssl_ca=/ruta/ca.pem`. Ese parámetro sí se respeta.

### Cargar las tablas

Un solo archivo deja la base lista: `backend/database/schema.sql`. Crea las
**14 tablas**, los tres usuarios de prueba (administrador, empleado y cliente),
las **12 motocicletas** del catálogo y los **8 servicios** del taller. Los otros
`.sql` de esa carpeta son migraciones para bases que ya existían; en una base
nueva no hacen falta.

> **Cuidado con el nombre de la base.** `schema.sql` empieza creando
> `bd_jhm_tech_solutions` y cambiándose a ella, mientras que la base que crea
> Railway se llama `railway`. Si lo pegas tal cual y dejas la `DATABASE_URL`
> apuntando a `railway`, las tablas se crean en un sitio y el Backend las busca
> en otro: arranca, pero no encuentra nada.
>
> La salida más limpia es no tocar el archivo y **cambiar el nombre de la base
> en la URL**, de `/railway` a `/bd_jhm_tech_solutions`:
>
> ```
> mysql://root:CLAVE@monorail.proxy.rlwy.net:33060/bd_jhm_tech_solutions
> ```
>
> Si la plataforma no te deja crear bases nuevas (pasa en varios planes
> gratuitos), entonces sí: borra del archivo las dos primeras instrucciones
> (`CREATE DATABASE` y `USE`) y deja la URL como venía.

Con el cliente de MySQL instalado es una sola línea:

```bash
mysql --host=HOST --port=PUERTO --user=root --password=CLAVE < backend/database/schema.sql
```

Sin cliente instalado, pega el contenido del archivo en la consola de
consultas que trae la plataforma (en Railway, pestaña **Data**).

### Llenar los Dashboards

Recién cargada, la base tiene catálogo y usuarios, pero ni una sola venta: los
Dashboards y los reportes saldrían en blanco. Para generar un historial de
demostración, apunta tu `.env` local a la base de la nube y ejecuta:

```bash
cd backend
python scripts/datos_demo.py
```

Crea ventas repartidas en las últimas semanas, con sus facturas y algunas PQR,
pasando por el mismo código que usa la API. Se deshace con `--limpiar`.

---

## Paso 3 · Desplegar el Backend

1. **Create** → **GitHub Repo** → elige el repositorio del proyecto.
2. En **Settings** del servicio, pon `backend` como **Root Directory**.
3. En **Variables**, añade:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | El `MYSQL_URL` que copiaste |
   | `JWT_SECRET` | Una cadena larga y aleatoria, distinta a la de desarrollo |
   | `ENTORNO` | `produccion` |
   | `DEPURACION` | `false` |
   | `ORIGENES_PERMITIDOS` | La URL pública del Frontend (paso 4) |
   | `URL_FRONTEND` | La misma URL del Frontend |

   El código convierte `mysql://` en `mysql+pymysql://` por su cuenta, así que
   `DATABASE_URL` se pega tal cual llega.

   `ORIGENES_PERMITIDOS` se escribe sin comillas ni corchetes. Una sola URL o
   varias separadas por comas:

   ```
   https://motoshub.up.railway.app,https://motoshub.vercel.app
   ```

4. En **Settings** → **Networking** → **Generate Domain** para obtener la URL
   pública del Backend.

5. Comprueba que responde:

   ```
   https://TU-BACKEND.up.railway.app/salud
   https://TU-BACKEND.up.railway.app/docs
   ```

   `/salud` debe devolver `"base_datos": "conectada"`.

---

## Paso 4 · Desplegar el Frontend

1. **Create** → **GitHub Repo** → el mismo repositorio.
2. **Root Directory**: `frontend`.
3. En **Variables**:

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://TU-BACKEND.up.railway.app/api` |

   Ojo con el `/api` del final: sin él, todas las peticiones darían 404.

4. **Generate Domain** para obtener la URL pública.
5. Vuelve al Backend y pon esa URL en `ORIGENES_PERMITIDOS` y `URL_FRONTEND`.
   Sin eso el navegador bloquea las peticiones por CORS.

> `VITE_API_URL` se lee **al compilar**, no al arrancar. Si la cambias después,
> hay que volver a desplegar el Frontend para que el cambio surta efecto.

### Alternativa: el Frontend en Vercel

Sale gratis de forma permanente y no consume el crédito de Railway, que
conviene reservar para el Backend y la base de datos.

1. En [vercel.com](https://vercel.com) → **Add New** → **Project** → importa el
   repositorio.
2. **Root Directory**: `frontend`. El resto lo detecta solo (Vite).
3. En **Environment Variables**, añade `VITE_API_URL` con la URL del Backend
   más `/api`.
4. **Deploy**.

El archivo `frontend/vercel.json` ya está en el repositorio: incluye la regla
que devuelve `index.html` en cualquier ruta, sin la cual entrar directo a
`/admin` daría 404.

Después, en el Backend, pon el dominio de Vercel en `ORIGENES_PERMITIDOS` y en
`URL_FRONTEND`.

---

## Paso 5 · Activar el chatbot con IA (opcional)

El chatbot funciona sin configurar nada: responde con su motor de reglas, que
consulta la misma base de datos. Para que responda con Inteligencia
Artificial, añade estas variables **en el Backend**:

| Variable | Valor |
|---|---|
| `IA_PROVEEDOR` | `anthropic` o `openai` |
| `IA_API_KEY` | Tu clave de acceso |
| `IA_MODELO` | Opcional; si se omite se usa un modelo económico |

Comprueba el resultado en `https://TU-BACKEND.up.railway.app/api/chatbot/estado`.

> **La API Key solo va en las variables del Backend.** Nunca en el código,
> nunca en el repositorio y nunca en una variable `VITE_`: todo lo que empieza
> por `VITE_` acaba dentro del JavaScript que descarga cualquier visitante.
>
> El endpoint `/api/chatbot/estado` dice si hay clave configurada, pero jamás
> devuelve su valor.

---

## Paso 6 · Comprobar que funciona

| Qué | Cómo |
|---|---|
| Backend vivo | `GET /salud` responde `"base_datos": "conectada"` |
| Documentación | `/docs` abre Swagger con los 45 endpoints |
| Frontend | La portada carga y el catálogo muestra productos |
| Rutas internas | Entrar directo a `/catalogo` y recargar no da 404 |
| Sesión | Iniciar sesión como administrador y abrir `/admin` |
| Dashboard | Las tarjetas y los gráficos traen datos |
| Reportes | Descargar el reporte del día en PDF y en Excel |
| Facturas | Descargar una factura en PDF |
| Chatbot | Preguntar por el catálogo y recibir respuesta |

---

## Si algo falla

| Síntoma | Causa habitual |
|---|---|
| El Frontend carga pero no trae datos | `VITE_API_URL` mal puesta, o falta `/api` al final |
| «No fue posible conectar con el servidor» | El Backend está caído, o su dominio no coincide con `VITE_API_URL` |
| Error de CORS en la consola del navegador | La URL del Frontend no está en `ORIGENES_PERMITIDOS` del Backend |
| `/salud` dice «sin conexión» | `DATABASE_URL` incorrecta, o las tablas no se han cargado |
| 404 al recargar `/admin` | El Frontend no se está sirviendo con `node servidor.js` |
| El enlace de recuperación apunta a localhost | Falta `URL_FRONTEND` en el Backend |
| El chatbot responde pero sin IA | Faltan `IA_PROVEEDOR` o `IA_API_KEY` |

---

## Desplegar en Render

Render sirve igual de bien para el Backend, y el repositorio trae un
`render.yaml` en la raíz que crea los dos servicios de una vez: en Render,
**New → Blueprint**, eliges el repositorio y él lo lee solo.

**Lo único que Render no puede darte es la base de datos.** Su catálogo de
bases gestionadas es PostgreSQL, no MySQL. Así que el MySQL tiene que vivir en
otra parte y llegar por `DATABASE_URL`: el de Railway sirve, y el plan gratuito
de Aiven también (ver [«Si la base va en Aiven»](#si-la-base-va-en-aiven)).

Si prefieres crear los servicios a mano en vez de usar el Blueprint:

| Campo | Backend | Frontend |
|---|---|---|
| Tipo | Web Service | Static Site |
| Root Directory | `backend` | `frontend` |
| Build Command | `pip install -r requirements.txt` | `npm ci && npm run build` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | — |
| Publish Directory | — | `dist` |
| Health Check Path | `/salud` | — |

Las variables de entorno son exactamente las mismas del paso 3 y del paso 4.

Dos detalles propios de Render:

- **`runtime.txt` no le sirve**, esa es convención de Heroku. La versión de
  Python se fija con la variable `PYTHON_VERSION` (el `render.yaml` ya la trae
  en `3.12.7`) o con el archivo `backend/.python-version`.
- En el **Static Site** hay que añadir una regla de reescritura de `/*` a
  `/index.html`, o entrar directo a `/admin` daría 404. El `render.yaml` ya la
  incluye; si creas el servicio a mano, va en **Redirects/Rewrites**.

### El plan gratuito se duerme

Un Web Service gratuito de Render se apaga tras unos 15 minutos sin visitas y
tarda cerca de un minuto en volver. Para uso propio no molesta, pero si alguien
va a abrir la URL para calificarla, se encuentra una pantalla congelada que
parece una aplicación rota. El Static Site no tiene ese problema: es gratis y
no se duerme nunca.

Hay un efecto secundario menor: los topes de la recuperación de contraseña se
llevan en memoria, así que cada vez que el servicio despierta empiezan de cero.
Como el límite es para frenar abusos y no para contar nada importante, no pasa
nada.

---

## Desplegar con Docker

Para plataformas que trabajan con imágenes (Render, Fly.io, Cloud Run, un VPS)
hay un `Dockerfile` en cada carpeta:

```bash
# Backend
docker build -t motoshub-api ./backend
docker run -p 8000:8000 --env-file backend/.env motoshub-api

# Frontend
docker build -t motoshub-web ./frontend \
  --build-arg VITE_API_URL=https://TU-BACKEND.up.railway.app/api
docker run -p 4173:4173 motoshub-web
```

> Estos `Dockerfile` siguen la estructura habitual para FastAPI y para una
> aplicación de Vite, pero **no se han construido en este equipo** porque no
> tiene Docker instalado. El camino probado de principio a fin es el de
> Nixpacks (`railway.json`), que es además el que usa Railway por omisión.

---

## Diferencias entre desarrollo y producción

| | Desarrollo | Producción |
|---|---|---|
| Frontend | `npm run dev` (puerto 5173) | `npm run build` + `node servidor.js` |
| Backend | `uvicorn --reload` (puerto 8000) | `uvicorn --host 0.0.0.0 --port $PORT` |
| Base de datos | MySQL de XAMPP | MySQL de la plataforma |
| `ENTORNO` | `desarrollo` | `produccion` |
| `JWT_SECRET` | El del ejemplo | Uno propio, largo y aleatorio |
| CORS | `localhost:5173` | El dominio público del Frontend |
