const ACENTOS = {
  brand: 'bg-brand-500/12 text-brand-400',
  ok: 'bg-ok-500/12 text-ok-400',
  info: 'bg-info-400/12 text-info-400',
  warn: 'bg-warn-400/12 text-warn-400',
  peligro: 'bg-danger-500/12 text-danger-400',
};

/**
 * Tarjeta (Card) de indicador del Dashboard.
 *
 * Todas las cifras que muestra vienen de GET /api/estadisticas: si el valor
 * llega como null significa que el rol del usuario no tiene permiso para
 * verlo, y entonces la tarjeta ni siquiera se dibuja.
 */
export default function TarjetaIndicador({
  etiqueta,
  valor,
  detalle,
  icono,
  acento = 'brand',
  cargando = false,
  onClick,
}) {
  if (valor === null || valor === undefined) return null;

  if (cargando) return <div className="esqueleto h-[6.5rem] w-full" />;

  const Contenedor = onClick ? 'button' : 'div';

  return (
    <Contenedor
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`metrica text-left ${onClick ? 'w-full cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.66rem] uppercase tracking-[0.14em] text-mist-600">{etiqueta}</p>
          <p className="mt-1.5 truncate font-display text-2xl font-bold text-mist-50">{valor}</p>
          {detalle && <p className="mt-1 truncate text-xs text-mist-500">{detalle}</p>}
        </div>
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${ACENTOS[acento]}`}
        >
          {icono}
        </span>
      </div>
    </Contenedor>
  );
}
