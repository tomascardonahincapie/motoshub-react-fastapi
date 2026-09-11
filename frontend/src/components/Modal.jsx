import { useEffect } from 'react';

/**
 * Ventana modal reutilizable para los formularios del panel.
 * Se cierra con Escape o haciendo clic fuera, y bloquea el desplazamiento
 * del fondo mientras está abierta.
 */
export default function Modal({ abierto, onCerrar, titulo, descripcion, children, ancho = 'max-w-2xl' }) {
  useEffect(() => {
    if (!abierto) return;

    const alPulsar = (evento) => evento.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', alPulsar);

    const desbordeOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPulsar);
      document.body.style.overflow = desbordeOriginal;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        onClick={(evento) => evento.stopPropagation()}
        className={`tarjeta my-auto w-full ${ancho} animate-escalar sombra-profunda`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-mist-50">{titulo}</h2>
            {descripcion && <p className="mt-0.5 text-xs text-mist-500">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-mist-400 transition-colors hover:border-line-strong hover:text-mist-50"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
