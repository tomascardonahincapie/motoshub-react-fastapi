# Evidencias — Cuarto Avance (React + Vite + FastAPI)

Ficha 3406211 · Instructor: Jhan Hader Muñoz

## Contenido

| Archivo | Descripción |
|---|---|
| `Lista_Chequeo_Cuarto_Avance_REACT_FASTAPI_DILIGENCIADA.xlsx` | Lista de chequeo con los 26 requerimientos, su estado, la captura de evidencia incrustada y las observaciones |
| `capturas/` | Las 26 capturas en tamaño original (1440 px de ancho, 2x) |

## Estado de los requerimientos

**26 de 26 cumplen (100 %).**

## Índice de capturas

| Archivo | Requerimiento |
|---|---|
| `req01_arquitectura.png` | Arquitectura tecnológica — React consumiendo FastAPI |
| `req02_estructura.png` | Estructura del proyecto: Frontend y Backend separados |
| `req03_entorno.png` | Entorno virtual de Python y `requirements.txt` |
| `req04_bd.png` | Base de datos SQL y sus seis tablas |
| `req05_tabla_usuarios.png` | Estructura de la tabla `usuarios` |
| `req06_modelos_esquemas.png` | Modelos SQLAlchemy frente a esquemas Pydantic |
| `req07_conexion_db.png` | Conexión a la base de datos por variables de entorno |
| `req08_flujo.png` | Frontend → Backend → base de datos, con revalidación |
| `req09_registro.png` | Formulario de registro de clientes |
| `req10_login.png` | Formulario de inicio de sesión |
| `req11_jwt.png` | Autenticación JWT y cabecera `Authorization` |
| `req12_roles.png` | Control de roles: 401 / 403 / 200 según el rol |
| `req13_hooks.png` | Uso de Hooks de React |
| `req14_endpoints.png` | Endpoints de la API |
| `req15_recuperacion.png` | Recuperación de contraseña: flujo completo |
| `req16_crud_usuarios.png` | CRUD completo de usuarios |
| `req17_panel_admin.png` | Panel de administración |
| `req18_panel_empleado.png` | Panel de empleado |
| `req19_panel_cliente.png` | Panel de cliente |
| `req20_navbar.png` | Usuario autenticado en el Navbar |
| `req21_validaciones.png` | Validaciones en tiempo real |
| `req22_hashing.png` | Contraseñas con hash bcrypt |
| `req23_env.png` | Variables de entorno |
| `req24_whatsapp.png` | Componente flotante de WhatsApp |
| `req25_swagger.png` | Documentación automática con Swagger |
| `req26_metodos_http.png` | GET, POST, PUT, PATCH y DELETE probados |

## Cómo se generaron

Las capturas de la aplicación se tomaron del proyecto en ejecución
(`http://localhost:5173` y `http://localhost:8000`) contra la base de datos
MySQL real. Las de terminal, SQL y código muestran la salida verdadera de los
comandos y el contenido de los archivos del proyecto.

La salida completa del recorrido de la API se reproduce con:

```bash
python backend/scripts/verificar_api.py
```

## Pendiente de diligenciar en la lista de chequeo

Las celdas resaltadas en amarillo:

- Nombre del aprendiz
- Documento de identidad
- URL del Drive o GitHub donde se aloje el entregable
