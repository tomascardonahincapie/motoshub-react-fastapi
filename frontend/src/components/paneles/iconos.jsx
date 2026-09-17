// Iconos de la navegación de los paneles.
//
// Están dibujados a mano en SVG, con el mismo grosor de trazo y la misma
// rejilla de 20x20, para que la barra lateral no mezcle estilos.

const Marco = ({ children }) => (
  <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px] shrink-0">
    {children}
  </svg>
);

export const ICONOS = {
  dashboard: (
    <Marco>
      <path d="M3 4.5h6v5H3zM11 4.5h6v3h-6zM11 10.5h6v5h-6zM3 12.5h6v3H3z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </Marco>
  ),
  ventas: (
    <Marco>
      <path d="M2.5 3h1.6l1.5 7.8a1.3 1.3 0 0 0 1.3 1h6.2a1.3 1.3 0 0 0 1.3-1l1-5.2H5"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.6" cy="15.4" r="1.1" fill="currentColor" />
      <circle cx="13.4" cy="15.4" r="1.1" fill="currentColor" />
    </Marco>
  ),
  facturas: (
    <Marco>
      <path d="M4.5 2.5h11v15l-2-1.3-1.8 1.3-1.7-1.3-1.8 1.3-1.8-1.3-1.9 1.3z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.2 6.5h5.6M7.2 9.5h5.6M7.2 12.5h3.4"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Marco>
  ),
  reportes: (
    <Marco>
      <path d="M11.5 2.5H5.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V6.5z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11.5 2.5v4h4M7.5 11.5h5M7.5 14h3"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Marco>
  ),
  pqr: (
    <Marco>
      <path d="M17 9.6a6.7 6.7 0 0 1-7.2 6.7 7.2 7.2 0 0 1-2.3-.3L4 17.5l1.3-3.1A6.5 6.5 0 0 1 3 9.6 6.7 6.7 0 0 1 10 3a6.7 6.7 0 0 1 7 6.6Z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.3 8.1a1.7 1.7 0 0 1 3.3.6c0 1.1-1.6 1.4-1.6 2.3"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="12.9" r="0.75" fill="currentColor" />
    </Marco>
  ),
  usuarios: (
    <Marco>
      <circle cx="7.5" cy="7" r="2.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 16c0-2.6 2.2-4.4 5-4.4s5 1.8 5 4.4"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13.5 5.2a2.6 2.6 0 0 1 0 5M14.5 11.9c1.9.4 3.2 1.8 3.2 3.6"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Marco>
  ),
  productos: (
    <Marco>
      <path d="M3 6.2 10 3l7 3.2v7.6L10 17l-7-3.2z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3 6.2 10 9.5l7-3.3M10 9.5V17"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </Marco>
  ),
  servicios: (
    <Marco>
      <path d="M12.5 3.5a4 4 0 0 0-4.9 5.2l-4.3 4.3a1.4 1.4 0 0 0 2 2l4.3-4.3a4 4 0 0 0 5.2-4.9l-2.3 2.3-2-.4-.4-2z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </Marco>
  ),
  cuenta: (
    <Marco>
      <circle cx="10" cy="6.8" r="3.1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 17c0-3 2.7-5.2 6-5.2s6 2.2 6 5.2"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Marco>
  ),
};
