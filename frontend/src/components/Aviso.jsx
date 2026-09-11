const estilos = {
  exito: {
    caja: 'border-ok-500/30 bg-ok-500/10 text-ok-400',
    icono: '✓',
  },
  error: {
    caja: 'border-danger-500/30 bg-danger-500/10 text-danger-400',
    icono: '⚠',
  },
  info: {
    caja: 'border-line bg-white/4 text-mist-300',
    icono: 'ℹ',
  },
};

/** Franja de aviso para confirmar una acción o mostrar un error del Backend. */
export default function Aviso({ tipo = 'info', children, onCerrar }) {
  if (!children) return null;
  const estilo = estilos[tipo] || estilos.info;

  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`mb-5 flex animate-subir items-start gap-3 rounded-xl border p-3.5 text-sm ${estilo.caja}`}
    >
      <span className="mt-px shrink-0 font-bold" aria-hidden="true">{estilo.icono}</span>
      <p className="flex-1 leading-relaxed">{children}</p>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Descartar aviso"
          className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
