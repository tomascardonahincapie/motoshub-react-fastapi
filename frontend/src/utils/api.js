// Cliente API centralizado: todas las peticiones al Backend (FastAPI) pasan por aquí.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
  } catch (networkError) {
    throw new Error('No fue posible conectar con el servidor. Verifica que el backend esté en ejecución.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // FastAPI identifica cada error con un `codigo`, más fiable que comparar
    // el texto del mensaje para saber si la sesión dejó de ser válida.
    const esTokenInvalido =
      token &&
      (response.status === 401 || response.status === 403) &&
      ['no_autenticado', 'token_invalido', 'cuenta_inactiva'].includes(data.codigo);

    if (esTokenInvalido) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    const error = new Error(data.message || 'Ocurrió un error en la solicitud');
    error.status = response.status;
    error.errors = data.errors || {};
    throw error;
  }

  return data;
}

export const api = {
  // Autenticación
  register: (payload) => request('/usuarios/registro', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),

  // Usuarios (requieren token)
  getUsuarios: (token) => request('/usuarios', { token }),
  getUsuario: (id, token) => request(`/usuarios/${id}`, { token }),
  createUsuario: (payload, token) => request('/usuarios', { method: 'POST', body: payload, token }),
  updateUsuario: (id, payload, token) => request(`/usuarios/${id}`, { method: 'PUT', body: payload, token }),
  cambiarEstadoUsuario: (id, estado, token) => request(`/usuarios/${id}/estado`, { method: 'PATCH', body: { estado }, token }),
  deleteUsuario: (id, token) => request(`/usuarios/${id}`, { method: 'DELETE', token }),

  // Productos (consulta pública, gestión protegida)
  getProductos: () => request('/productos'),
  getProducto: (id) => request(`/productos/${id}`),
  createProducto: (payload, token) => request('/productos', { method: 'POST', body: payload, token }),
  updateProducto: (id, payload, token) => request(`/productos/${id}`, { method: 'PUT', body: payload, token }),
  deleteProducto: (id, token) => request(`/productos/${id}`, { method: 'DELETE', token }),

  // Servicios (consulta pública, gestión protegida)
  getServicios: () => request('/servicios'),
  getServicio: (id) => request(`/servicios/${id}`),
  createServicio: (payload, token) => request('/servicios', { method: 'POST', body: payload, token }),
  updateServicio: (id, payload, token) => request(`/servicios/${id}`, { method: 'PUT', body: payload, token }),
  deleteServicio: (id, token) => request(`/servicios/${id}`, { method: 'DELETE', token }),
};
