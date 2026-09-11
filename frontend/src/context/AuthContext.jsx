import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'motoshub_auth';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Recupera la sesión guardada al cargar la aplicación
  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) {
      try {
        const { usuario: u, token: t } = JSON.parse(guardado);
        setUsuario(u);
        setToken(t);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setCargando(false);
  }, []);

  const login = (data) => {
    setUsuario(data.usuario);
    setToken(data.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ usuario: data.usuario, token: data.token }));
  };

  const logout = () => {
    setUsuario(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Si cualquier petición al backend detecta que el token ya no es válido
  // (expiró, cambió el secreto, etc.), cerramos la sesión automáticamente
  // en vez de dejar al usuario "adentro" con un token que no sirve.
  useEffect(() => {
    const manejarSesionExpirada = () => {
      sessionStorage.setItem('motoshub_session_expired', '1');
      logout();
    };
    window.addEventListener('auth:expired', manejarSesionExpirada);
    return () => window.removeEventListener('auth:expired', manejarSesionExpirada);
  }, []);

  const value = {
    usuario,
    token,
    cargando,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  return context;
}
