import { Link } from 'react-router-dom';
import Logo from './Logo';
import IconoWhatsApp from './IconoWhatsApp';
import { NEGOCIO, enlaceWhatsApp } from '../config';

const columnas = [
  {
    titulo: 'Navegación',
    enlaces: [
      { to: '/', label: 'Inicio' },
      { to: '/catalogo', label: 'Catálogo' },
      { to: '/about', label: 'Nosotros' },
      { to: '/contact', label: 'Contacto' },
    ],
  },
  {
    titulo: 'Tu cuenta',
    enlaces: [
      { to: '/login', label: 'Iniciar sesión' },
      { to: '/catalogo', label: 'Productos' },
      { to: '/catalogo', label: 'Servicios de taller' },
    ],
  },
];

export default function Footer() {
  const anio = new Date().getFullYear();

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-line bg-ink-900/60">
      <div className="halo -top-24 left-1/4 h-64 w-64 bg-brand-500/10" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Marca */}
          <div>
            <div className="flex items-center gap-2.5">
              <Logo className="h-9 w-9" />
              <span className="font-display text-xl font-bold uppercase tracking-[0.18em] text-mist-50">
                Motos<span className="text-brand-500">Hub</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-mist-500">
              Venta de motocicletas, repuestos y accesorios, con taller propio para el
              mantenimiento de tu moto.
            </p>
            <a
              href={enlaceWhatsApp(`Hola ${NEGOCIO.nombre}, quiero más información.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp mt-5 w-auto !py-2 !text-[0.7rem]"
            >
              <IconoWhatsApp className="h-4 w-4" />
              Escríbenos
            </a>
          </div>

          {/* Enlaces */}
          {columnas.map((columna) => (
            <div key={columna.titulo}>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-mist-50">
                {columna.titulo}
              </h4>
              <ul className="space-y-2">
                {columna.enlaces.map((enlace) => (
                  <li key={enlace.label}>
                    <Link
                      to={enlace.to}
                      className="text-sm text-mist-500 transition-colors hover:text-brand-400"
                    >
                      {enlace.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contacto */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-mist-50">Contacto</h4>
            <ul className="space-y-2.5 text-sm text-mist-500">
              <li className="flex gap-2.5">
                <span aria-hidden="true">📍</span>
                <span>{NEGOCIO.direccion}</span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true">✉️</span>
                <a href={`mailto:${NEGOCIO.correo}`} className="transition-colors hover:text-brand-400">
                  {NEGOCIO.correo}
                </a>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true">📞</span>
                <span>{NEGOCIO.telefono}</span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true">🕐</span>
                <span>{NEGOCIO.horario}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-mist-600 sm:flex-row">
          <p>&copy; {anio} {NEGOCIO.nombre}. Todos los derechos reservados.</p>
          <p>Proyecto formativo · Ficha 3406211 · React + Vite + FastAPI</p>
        </div>
      </div>
    </footer>
  );
}
