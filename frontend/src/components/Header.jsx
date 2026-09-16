import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCarrito } from '../context/CarritoContext';
import MenuUsuario from './MenuUsuario';
import Logo from './Logo';

const enlaces = [
  { to: '/', label: 'Inicio', exacto: true },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/about', label: 'Nosotros' },
  { to: '/contact', label: 'Contacto' },
];

export default function Header() {
  const { isAuthenticated } = useAuth();
  const { totales, abrir } = useCarrito();
  const [desplazado, setDesplazado] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // La barra se compacta y opaca al bajar, para no competir con el contenido.
  useEffect(() => {
    const alDesplazar = () => setDesplazado(window.scrollY > 12);
    alDesplazar();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => window.removeEventListener('scroll', alDesplazar);
  }, []);

  const claseEnlace = ({ isActive }) =>
    `enlace-nav text-[0.82rem] font-semibold uppercase tracking-wider ${
      isActive ? 'enlace-nav-activo text-mist-50' : 'text-mist-400 hover:text-mist-50'
    }`;

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        desplazado
          ? 'border-b border-line bg-ink-950/96 py-2.5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.95)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent py-4'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="group flex items-center gap-2.5">
          <Logo className="h-9 w-9 transition-transform duration-500 group-hover:rotate-[18deg]" />
          <span className="font-display text-xl font-bold uppercase tracking-[0.18em] text-mist-50">
            Motos<span className="text-brand-500">Hub</span>
          </span>
        </Link>

        {/* Navegación de escritorio */}
        <nav className="hidden items-center gap-8 lg:flex">
          {enlaces.map((enlace) => (
            <NavLink key={enlace.to} to={enlace.to} end={enlace.exacto} className={claseEnlace}>
              {enlace.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Carrito: el número sale del propio carrito, no del Backend */}
          <button
            type="button"
            onClick={abrir}
            aria-label={`Abrir el carrito (${totales.unidades} artículos)`}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-ink-850 text-mist-200 transition-colors hover:border-brand-500/50 hover:text-brand-400"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path
                d="M2.5 3h1.7l1.6 8.4a1.4 1.4 0 0 0 1.4 1.1h6.6a1.4 1.4 0 0 0 1.4-1.1l1.1-5.6H5.2"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="8" cy="16" r="1.2" fill="currentColor" />
              <circle cx="14" cy="16" r="1.2" fill="currentColor" />
            </svg>
            {totales.unidades > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[0.62rem] font-bold text-white">
                {totales.unidades}
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <MenuUsuario />
          ) : (
            <Link to="/login" className="btn btn-primario hidden sm:inline-flex">
              Iniciar sesión
            </Link>
          )}

          {/* Botón de menú en móvil */}
          <button
            type="button"
            onClick={() => setMenuAbierto((previo) => !previo)}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-ink-850 text-mist-200 transition-colors hover:border-line-strong lg:hidden"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              {menuAbierto ? (
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Panel desplegable en móvil */}
      {menuAbierto && (
        <nav className="mx-5 mt-3 animate-subir overflow-hidden rounded-xl border border-line bg-ink-900/95 p-2 backdrop-blur-xl lg:hidden">
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              end={enlace.exacto}
              onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
                  isActive ? 'bg-brand-500/12 text-brand-400' : 'text-mist-400 hover:bg-white/5 hover:text-mist-50'
                }`
              }
            >
              {enlace.label}
            </NavLink>
          ))}
          {!isAuthenticated && (
            <Link
              to="/login"
              onClick={() => setMenuAbierto(false)}
              className="btn btn-primario mt-2 w-full"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
