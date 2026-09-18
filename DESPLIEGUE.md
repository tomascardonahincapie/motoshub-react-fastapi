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

### Cargar las tablas

En la pestaña **Data** del servicio MySQL hay una consola de consultas. Pega
ahí el contenido de `backend/database/schema.sql`, **quitando las dos primeras
instrucciones** (`CREATE DATABASE` y `USE`): la base ya existe y se llama
`railway`.

Después carga los datos de demostración:

- `backend/database/usuarios_demo.sql` — usuarios de cada rol
- `backend/database/actualizar_imagenes.sql` — fotos del catálogo

Si prefieres la línea de comandos, con el cliente de MySQL instalado:

```bash
mysql --host=HOST --port=PUERTO --user=root --password=CLAVE railway < backend/database/schema.sql
```

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
