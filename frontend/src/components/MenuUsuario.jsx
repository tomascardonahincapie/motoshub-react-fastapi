import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// A dónde lleva "Mi panel" según el rol con el que inició sesión el usuario.
export const RUTA_POR_ROL = {
  Administrador: '/admin',
  Empleado: '/empleado',
  Cliente: '/cliente',
};

const ETIQUETA_PANEL = {
  Administrador: 'Panel de administración',
  Empleado: 'Panel de empleado',
  Cliente: 'Mi cuenta',
};

const COLOR_ROL = {
  Administrador: 'etiqueta-marca',
  Empleado: 'etiqueta-ok',
  Cliente: 'etiqueta-neutra',
};

function iniciales(usuario) {
  const nombre = usuario?.nombres?.trim()?.[0] || '';
  const apellido = usuario?.apellidos?.trim()?.[0] || '';
  return (nombre + apellido).toUpperCase() || '?';
}

/**
 * Avatar del usuario autenticado que despliega un menú con su información,
 * el acceso a su panel según el rol y el cierre de sesión.
 */
export default function MenuUsuario({ compacto = false }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);

  // Cierra el menú al hacer clic fuera o al pulsar Escape.
  useEffect(() => {
    if (!abierto) return;

    const clicFuera = (evento) => {
      if (contenedor.current && !contenedor.current.contains(evento.target)) {
        setAbierto(false);
      }
    };
    const teclaEscape = (evento) => evento.key === 'Escape' && setAbierto(false);

    document.addEventListener('mousedown', clicFuera);
    document.addEventListener('keydown', teclaEscape);
    return () => {
      document.removeEventListener('mousedown', clicFuera);
      document.removeEventListener('keydown', teclaEscape);
    };
  }, [abierto]);

  if (!usuario) return null;

  const rol = usuario.nombre_rol;
  const rutaPanel = RUTA_POR_ROL[rol] || '/';

  const cerrarSesion = () => {
    setAbierto(false);
    logout();
    navigate('/');
  };

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className={`group flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-3 transition-all ${
          abierto
            ? 'border-brand-500/60 bg-ink-800'
            : 'border-line bg-ink-850/70 hover:border-line-strong hover:bg-ink-800'
        }`}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-black text-white">
          {iniciales(usuario)}
          {/* Punto verde de "sesión activa" */}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-900 bg-ok-500" />
        </span>

        {!compacto && (
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-[9rem] truncate text-[0.8rem] font-semibold text-mist-50">
              {usuario.nombres}
            </span>
            <span className="block text-[0.65rem] uppercase tracking-wider text-mist-500">{rol}</span>
          </span>
        )}

        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`h-3.5 w-3.5 shrink-0 text-mist-500 transition-transform duration-300 ${abierto ? 'rotate-180' : ''}`}
        >
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto && (
        <div
          role="menu"
          className="vidrio absolute right-0 z-50 mt-2 w-64 origin-top-right animate-escalar overflow-hidden rounded-xl sombra-profunda"
        >
          {/* Cabecera con los datos de la sesión */}
          <div className="border-b border-line bg-gradient-to-br from-brand-500/10 to-transparent px-4 py-3.5">
            <p className="truncate text-sm font-bold text-mist-50">
              {usuario.nombres} {usuario.apellidos}
            </p>
            <p className="mt-0.5 truncate text-xs text-mist-500">{usuario.email}</p>
            <span className={`etiqueta ${COLOR_ROL[rol] || 'etiqueta-neutra'} mt-2`}>{rol}</span>
          </div>

          <nav className="p-1.5">
            <Link
              to={rutaPanel}
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-mist-200 transition-colors hover:bg-white/6 hover:text-mist-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500/12 text-brand-400">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="M3 4.5h6v5H3zM11 4.5h6v3h-6zM11 10.5h6v5h-6zM3 12.5h6v3H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </span>
              {ETIQUETA_PANEL[rol] || 'Mi panel'}
            </Link>

            <Link
              to="/catalogo"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-mist-200 transition-colors hover:bg-white/6 hover:text-mist-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/6 text-mist-400">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="M3 6.5h14M3 10h14M3 13.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              Ver catálogo
            </Link>

            <div className="my-1.5 h-px bg-line" />

            <button
              type="button"
              role="menuitem"
              onClick={cerrarSesion}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-danger-400 transition-colors hover:bg-danger-500/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-danger-500/12">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="M12 6.5V4.5a1 1 0 0 0-1-1H4.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1H11a1 1 0 0 0 1-1v-2M8 10h8.5m0 0-2.5-2.5M16.5 10 14 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Cerrar sesión
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
