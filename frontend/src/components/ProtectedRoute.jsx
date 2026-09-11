import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Envuelve una ruta y exige que el usuario esté autenticado y, opcionalmente,
// que tenga uno de los roles permitidos (nombre_rol: Administrador / Empleado / Cliente).
export default function ProtectedRoute({ children, rolesPermitidos }) {
  const { isAuthenticated, usuario, cargando } = useAuth();

  if (cargando) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.nombre_rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
