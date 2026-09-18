# Evidencias — Quinto Avance (React + Vite + FastAPI + IA)

Ficha 3406211 · Instructor: Jhan Hader Muñoz

Las 38 capturas de `capturas/` se tomaron del proyecto **en ejecución** contra
la base de datos MySQL real. Las de terminal, SQL y código muestran la salida
verdadera de los comandos y el contenido de los archivos del proyecto.

## Lista de chequeo

[`Lista_Chequeo_Quinto_Avance_DILIGENCIADA.xlsx`](Lista_Chequeo_Quinto_Avance_DILIGENCIADA.xlsx)
lleva los 25 requerimientos con su estado, la captura incrustada y una nota de
entrega en cada uno.

**23 de 25 cumplidos (92 %).** Los dos que faltan dependen de algo externo al
código:

| Requerimiento | Estado | Qué falta |
|---|---|---|
| REQ-18 · Chatbot con IA | En Proceso | Cargar una API Key en `IA_API_KEY`. La integración está construida y probada con el proveedor simulado; sin clave el chatbot responde con su motor de reglas. |
| REQ-20 · Despliegue | En Proceso | Ejecutar el despliegue y publicar la URL. La configuración está lista y ensayada en local; hace falta crear las cuentas. Ver [`DESPLIEGUE.md`](../../DESPLIEGUE.md). |

## Índice

### Base de datos y arquitectura

| Archivo | Evidencia |
|---|---|
| `ev01_base_datos.png` | Base de datos ampliada a 14 tablas |
| `ev02_tablas_nuevas.png` | Estructura de `detalle_ventas`, `facturas`, `detalle_facturas` y `pqr` |
| `ev03_relaciones.png` | Claves foráneas entre las tablas nuevas |
| `ev04_modelos_esquemas.png` | Modelo ORM frente a esquema Pydantic |
| `ev05_endpoints_nuevos.png` | Endpoints nuevos documentados en Swagger |

### Ventas y facturación

| Archivo | Evidencia |
|---|---|
| `ev06_registrar_venta.png` | Registro de una venta desde el panel |
| `ev07_precio_del_catalogo.png` | El precio lo pone el catálogo, no la petición |
| `ev08_historial_ventas.png` | Historial de ventas con sus filtros |
| `ev09_detalle_venta.png` | Detalle de una venta y su factura |
| `ev13_consulta_facturas.png` | Consulta de facturas con búsqueda y filtros |
| `ev14_factura_pdf.png` | Factura de venta descargada en PDF |
| `ev28_carrito_compra.png` | Carrito de compras del sitio público |
| `ev34_catalogo.png` | Catálogo con las fotos corregidas |
| `ev36_componentes_react.png` | Componentes reutilizables de React |

### Reportes

| Archivo | Evidencia |
|---|---|
| `ev10_reporte_diario.png` | Reporte diario de ventas en pantalla |
| `ev11_reporte_pdf.png` | Reporte diario exportado a PDF |
| `ev12_reporte_excel.png` | Reporte diario exportado a Excel |

### Dashboards

| Archivo | Evidencia |
|---|---|
| `ev15_dashboard_admin.png` | Dashboard administrativo con tarjetas de indicadores |
| `ev16_grafico_barras.png` | Gráfico de barras de ventas por periodo |
| `ev17_grafico_lineal.png` | Gráfico lineal de tendencia |
| `ev18_ranking_y_repartos.png` | Lo más vendido y reparto por estado y forma de pago |
| `ev19_dashboard_empleado.png` | Dashboard del empleado |
| `ev20_dashboard_cliente.png` | Dashboard del cliente |
| `ev21_dashboard_por_roles.png` | El recorte por rol lo decide el Backend |
| `ev35_filtros_dashboard.png` | Filtros del Dashboard aplicados |
| `ev22_compras_del_cliente.png` | El cliente consulta sus propias compras |
| `ev23_facturas_del_cliente.png` | El cliente descarga sus propias facturas |

### PQR y chatbot

| Archivo | Evidencia |
|---|---|
| `ev24_radicar_pqr.png` | Registro de una PQR por parte del cliente |
| `ev25_gestion_pqr.png` | Gestión y respuesta de una PQR |
| `ev26_chatbot.png` | Conversación con el chatbot en el sitio público |
| `ev27_integracion_ia.png` | Integración del chatbot con el servicio de IA |

### Seguridad, pruebas y despliegue

| Archivo | Evidencia |
|---|---|
| `ev29_variables_entorno.png` | Variables de entorno sin exponer la API Key |
| `ev37_seguridad_integral.png` | JWT, roles, hashing y variables de entorno |
| `ev30_pruebas_automaticas.png` | 133 pruebas automáticas en verde |
| `ev31_pruebas_endpoints.png` | Pruebas de los endpoints: ventas y facturación |
| `ev32_pruebas_endpoints_2.png` | Pruebas de reportes, PQR, Dashboards y chatbot |
| `ev33_despliegue.png` | Configuración de despliegue en producción |
| `ev38_postman_newman.png` | La colección de Postman corrida entera: 97 comprobaciones, 0 fallos |

## Cómo reproducirlo

Con MySQL encendido y las dos terminales levantadas:

```bash
# Terminal 1
cd backend && uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm run dev
```

Y después:

```bash
cd backend
python scripts/datos_demo.py                # historial de demostración
python scripts/verificar_quinto_avance.py   # recorrido completo de la API
pytest -q                                   # 133 pruebas automáticas
```

Las mismas peticiones están en la colección de Postman:
`backend/postman/MotosHub_API.postman_collection.json` — 86 peticiones en 13
carpetas, con 97 comprobaciones automáticas. Se puede correr entera sin abrir
Postman, y se puede repetir las veces que haga falta porque no deja rastro:

```bash
npx newman run backend/postman/MotosHub_API.postman_collection.json
```

## Cobertura de los requerimientos

| # | Requerimiento | Evidencia |
|---|---|---|
| 1 | Módulo de ventas | `ev06`, `ev07`, `ev28`, `ev34` |
| 2 | Registro de productos y servicios vendidos | `ev02`, `ev09` |
| 3 | Historial de ventas | `ev08`, `ev22` |
| 4 | Reporte diario de ventas | `ev10` |
| 5 | Exportación del reporte en PDF | `ev11` |
| 6 | Exportación del reporte en Excel | `ev12` |
| 7 | Generación de facturas de venta | `ev14` |
| 8 | Consulta de facturas | `ev13`, `ev23` |
| 9 | Descarga de facturas | `ev14`, `ev23` |
| 10 | Dashboard administrativo | `ev15` |
| 11 | Dashboard de ventas (barras, lineal y Cards) | `ev16`, `ev17`, `ev18` |
| 12 | Dashboards según los roles | `ev19`, `ev20`, `ev21` |
| 13 | Filtros para los Dashboards | `ev15`, `ev08` |
| 14 | Nuevos endpoints en FastAPI | `ev05` |
| 15 | Integración del Dashboard con FastAPI | `ev21`, `ev31`, `ev32` |
| 16 | Módulo de PQR | `ev24`, `ev25` |
| 17 | Chatbot para atención al cliente | `ev26` |
| 18 | Integración del chatbot con IA | `ev27` |
| 19 | Gestión segura de la API Key | `ev29` |
| 20 | Integración completa y despliegue | `ev33` y [`DESPLIEGUE.md`](../../DESPLIEGUE.md) |
| 21 | Evolución de la base de datos SQL | `ev01`, `ev02`, `ev03` |
| 22 | Modelos y esquemas de FastAPI | `ev04` |
| 23 | Componentes reutilizables de React | `ev36` |
| 24 | Seguridad integral de los endpoints | `ev37`, `ev29` |
| 25 | Pruebas de endpoints con Postman | `ev38`, `ev31`, `ev32` |

## Pendiente

El **requerimiento 20** pide además la **URL pública de la aplicación
desplegada**. La configuración está lista y documentada, pero el despliegue en
sí necesita una cuenta de Railway (o equivalente): hay que crearla y seguir el
paso a paso de [`DESPLIEGUE.md`](../../DESPLIEGUE.md). Una vez desplegado,
conviene añadir aquí dos capturas más:

- La aplicación funcionando en su dominio público.
- `GET /salud` del Backend desplegado respondiendo `"base_datos": "conectada"`.
