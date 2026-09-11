import { Link } from 'react-router-dom';
import Logo from './Logo';

const Icono = ({ children }) => (
  <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px] shrink-0">
    {children}
  </svg>
);

export const SECCIONES = [
  {
    clave: 'resumen',
    etiqueta: 'Resumen',
    icono: (
      <Icono>
        <path d="M3 4.5h6v5H3zM11 4.5h6v3h-6zM11 10.5h6v5h-6zM3 12.5h6v3H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </Icono>
    ),
  },
  {
    clave: 'usuarios',
    etiqueta: 'Usuarios',
    icono: (
      <Icono>
        <circle cx="7.5" cy="7" r="2.8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 16c0-2.6 2.2-4.4 5-4.4s5 1.8 5 4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M13.5 5.2a2.6 2.6 0 0 1 0 5M14.5 11.9c1.9.4 3.2 1.8 3.2 3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </Icono>
    ),
  },
  {
    clave: 'productos',
    etiqueta: 'Productos',
    icono: (
      <Icono>
        <path d="M3 6.2 10 3l7 3.2v7.6L10 17l-7-3.2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M3 6.2 10 9.5l7-3.3M10 9.5V17" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </Icono>
    ),
  },
  {
    clave: 'servicios',
    etiqueta: 'Servicios',
    icono: (
      <Icono>
        <path d="M12.5 3.5a4 4 0 0 0-4.9 5.2l-4.3 4.3a1.4 1.4 0 0 0 2 2l4.3-4.3a4 4 0 0 0 5.2-4.9l-2.3 2.3-2-.4-.4-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </Icono>
    ),
  },
];

/** Barra lateral del panel de administración. */
export default function AdminSidebar({ seccion, setSeccion, abiertaEnMovil, cerrarEnMovil }) {
  return (
    <>
      {/* Velo oscuro detrás del menú en móvil */}
      {abiertaEnMovil && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm lg:hidden"
          onClick={cerrarEnMovil}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-line bg-ink-900 transition-transform duration-300 lg:static lg:translate-x-0 ${
          abiertaEnMovil ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Marca */}
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-5">
          <Logo className="h-8 w-8" />
          <div className="leading-tight">
            <p className="font-display text-base font-bold uppercase tracking-[0.16em] text-mist-50">
              Motos<span className="text-brand-500">Hub</span>
            </p>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-mist-600">Administración</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {SECCIONES.map((item) => {
            const activa = seccion === item.clave;
            return (
              <button
                key={item.clave}
                type="button"
                onClick={() => {
                  setSeccion(item.clave);
                  cerrarEnMovil?.();
                }}
                aria-current={activa ? 'page' : undefined}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[0.82rem] font-semibold transition-all ${
                  activa
                    ? 'bg-brand-500/12 text-brand-400'
                    : 'text-mist-400 hover:bg-white/5 hover:text-mist-50'
                }`}
              >
                {/* Marcador vertical de la sección activa */}
                {activa && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500" />
                )}
                {item.icono}
                {item.etiqueta}
              </button>
            );
          })}
        </nav>

        {/* Volver al sitio público */}
        <div className="border-t border-line p-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[0.82rem] font-semibold text-mist-400 transition-colors hover:bg-white/5 hover:text-mist-50"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
              <path d="M9 15.5H4.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1H9M12.5 13l3-3-3-3M15.5 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Ir al sitio
          </Link>
        </div>
      </aside>
    </>
  );
}
