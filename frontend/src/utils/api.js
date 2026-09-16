// Cliente API centralizado: todas las peticiones al Backend (FastAPI) pasan por aquí.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/** Convierte { desde: '2026-09-01', estado: null } en "?desde=2026-09-01". */
function consulta(parametros = {}) {
  const limpios = Object.entries(parametros).filter(
    ([, valor]) => valor !== undefined && valor !== null && valor !== '',
  );
  if (limpios.length === 0) return '';
  return `?${new URLSearchParams(limpios).toString()}`;
}

function esSesionExpirada(response, data, token) {
  // FastAPI identifica cada error con un `codigo`, más fiable que comparar
  // el texto del mensaje para saber si la sesión dejó de ser válida.
  return (
    token &&
    (response.status === 401 || response.status === 403) &&
    ['no_autenticado', 'token_invalido', 'cuenta_inactiva'].includes(data.codigo)
  );
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No fue posible conectar con el servidor. Verifica que el backend esté en ejecución.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (esSesionExpirada(response, data, token)) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    const error = new Error(data.message || 'Ocurrió un error en la solicitud');
    error.status = response.status;
    error.errors = data.errors || {};
    throw error;
  }

  return data;
}

/**
 * Descarga un archivo del Backend (PDF o Excel) y lanza el guardado.
 *
 * A diferencia de `request`, la respuesta no es JSON sino binaria, así que el
 * error hay que leerlo aparte: cuando algo falla, FastAPI sí responde JSON.
 */
async function descargar(path, { token, nombrePorDefecto } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers });
  } catch {
    throw new Error('No fue posible conectar con el servidor.');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (esSesionExpirada(response, data, token)) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    throw new Error(data.message || 'No se pudo generar el archivo');
  }

  // El Backend envía el nombre en Content-Disposition; si el navegador no lo
  // deja leer, se usa el nombre que indique quien llama.
  const cabecera = response.headers.get('Content-Disposition') || '';
  const encontrado = /filename="?([^"]+)"?/.exec(cabecera);
  const nombre = encontrado ? encontrado[1] : nombrePorDefecto;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Sin esto el blob se queda en memoria mientras la pestaña siga abierta.
  URL.revokeObjectURL(url);

  return nombre;
}

export const api = {
  // --- Autenticación ------------------------------------------------------
  register: (payload) => request('/usuarios/registro', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),

  // --- Recuperación de contraseña ----------------------------------------
  recuperarPassword: (email) =>
    request('/auth/recuperar-password', { method: 'POST', body: { email } }),
  verificarTokenRecuperacion: (token) => request(`/auth/restablecer-password/${token}`),
  restablecerPassword: (token, password) =>
    request('/auth/restablecer-password', { method: 'POST', body: { token, password } }),

  // --- Usuarios (requieren token) ----------------------------------------
  getUsuarios: (token) => request('/usuarios', { token }),
  getUsuario: (id, token) => request(`/usuarios/${id}`, { token }),
  createUsuario: (payload, token) => request('/usuarios', { method: 'POST', body: payload, token }),
  updateUsuario: (id, payload, token) => request(`/usuarios/${id}`, { method: 'PUT', body: payload, token }),
  cambiarEstadoUsuario: (id, estado, token) =>
    request(`/usuarios/${id}/estado`, { method: 'PATCH', body: { estado }, token }),
  deleteUsuario: (id, token) => request(`/usuarios/${id}`, { method: 'DELETE', token }),

  // --- Productos (consulta pública, gestión protegida) -------------------
  getProductos: () => request('/productos'),
  getProducto: (id) => request(`/productos/${id}`),
  createProducto: (payload, token) => request('/productos', { method: 'POST', body: payload, token }),
  updateProducto: (id, payload, token) => request(`/productos/${id}`, { method: 'PUT', body: payload, token }),
  deleteProducto: (id, token) => request(`/productos/${id}`, { method: 'DELETE', token }),

  // --- Servicios (consulta pública, gestión protegida) -------------------
  getServicios: () => request('/servicios'),
  getServicio: (id) => request(`/servicios/${id}`),
  createServicio: (payload, token) => request('/servicios', { method: 'POST', body: payload, token }),
  updateServicio: (id, payload, token) => request(`/servicios/${id}`, { method: 'PUT', body: payload, token }),
  deleteServicio: (id, token) => request(`/servicios/${id}`, { method: 'DELETE', token }),

  // --- Ventas -------------------------------------------------------------
  crearVenta: (payload, token) => request('/ventas', { method: 'POST', body: payload, token }),
  getVentas: (filtros, token) => request(`/ventas${consulta(filtros)}`, { token }),
  getVenta: (id, token) => request(`/ventas/${id}`, { token }),
  cambiarEstadoVenta: (id, estado, token) =>
    request(`/ventas/${id}/estado`, { method: 'PATCH', body: { estado }, token }),

  // --- Facturas -----------------------------------------------------------
  emitirFactura: (payload, token) => request('/facturas', { method: 'POST', body: payload, token }),
  getFacturas: (filtros, token) => request(`/facturas${consulta(filtros)}`, { token }),
  getFactura: (id, token) => request(`/facturas/${id}`, { token }),
  cambiarEstadoFactura: (id, estado, token) =>
    request(`/facturas/${id}/estado`, { method: 'PATCH', body: { estado }, token }),
  descargarFactura: (id, numero, token) =>
    descargar(`/facturas/${id}/pdf`, { token, nombrePorDefecto: `${numero || 'factura'}.pdf` }),

  // --- Reportes -----------------------------------------------------------
  getReporteDiario: (fecha, token) => request(`/reportes/ventas-diarias${consulta({ fecha })}`, { token }),
  descargarReportePdf: (fecha, token) =>
    descargar(`/reportes/ventas-diarias/pdf${consulta({ fecha })}`, {
      token, nombrePorDefecto: `reporte_ventas_${fecha}.pdf`,
    }),
  descargarReporteExcel: (fecha, token) =>
    descargar(`/reportes/ventas-diarias/excel${consulta({ fecha })}`, {
      token, nombrePorDefecto: `reporte_ventas_${fecha}.xlsx`,
    }),

  // --- PQR ----------------------------------------------------------------
  crearPqr: (payload, token) => request('/pqr', { method: 'POST', body: payload, token }),
  getPqr: (filtros, token) => request(`/pqr${consulta(filtros)}`, { token }),
  responderPqr: (id, payload, token) => request(`/pqr/${id}`, { method: 'PATCH', body: payload, token }),

  // --- Dashboards ---------------------------------------------------------
  getResumen: (token) => request('/estadisticas/resumen', { token }),
  getDashboardVentas: (filtros, token) => request(`/estadisticas/ventas${consulta(filtros)}`, { token }),

  // --- Chatbot (el mensaje funciona con o sin sesión iniciada) ------------
  getEstadoChatbot: () => request('/chatbot/estado'),
  enviarMensajeChat: (payload, token) => request('/chatbot/mensaje', { method: 'POST', body: payload, token }),
};
