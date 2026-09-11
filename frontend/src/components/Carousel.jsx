import { useCallback, useEffect, useRef, useState } from 'react';

const DURACION = 5200;

/**
 * Carrusel de motos destacadas: imagen a sangre, texto sobre un velo oscuro,
 * avance automático con barra de progreso y control por teclado.
 */
export default function Carousel({ bikes }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const contenedor = useRef(null);

  const ir = useCallback(
    (nuevo) => setIndice((nuevo + bikes.length) % bikes.length),
    [bikes.length],
  );

  const siguiente = useCallback(() => ir(indice + 1), [ir, indice]);
  const anterior = useCallback(() => ir(indice - 1), [ir, indice]);

  // Avance automático, que se detiene si el cursor está encima.
  useEffect(() => {
    if (pausado) return;
    const temporizador = setTimeout(siguiente, DURACION);
    return () => clearTimeout(temporizador);
  }, [indice, pausado, siguiente]);

  // Flechas del teclado cuando el carrusel tiene el foco.
  const alPulsarTecla = (evento) => {
    if (evento.key === 'ArrowRight') siguiente();
    if (evento.key === 'ArrowLeft') anterior();
  };

  const moto = bikes[indice];

  return (
    <div
      ref={contenedor}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onKeyDown={alPulsarTecla}
      tabIndex={0}
      role="region"
      aria-roledescription="carrusel"
      aria-label="Motos destacadas"
      className="tarjeta group relative overflow-hidden rounded-2xl sombra-profunda"
    >
      {/* Pila de imágenes: solo la activa es opaca, las demás se desvanecen */}
      <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
        {bikes.map((item, i) => (
          <img
            key={item.id}
            src={item.image}
            alt={item.title}
            aria-hidden={i !== indice}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1100ms] ease-out ${
              i === indice ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
            }`}
          />
        ))}

        {/* Velo para que el texto se lea sobre cualquier foto */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/72 to-ink-950/10"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent"
          aria-hidden="true"
        />

        {/* Texto */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:justify-center sm:p-10 md:p-14">
          <div key={indice} className="max-w-lg animate-subir">
            <span className="etiqueta etiqueta-marca mb-3">Modelo {moto.year}</span>
            <h3 className="titulo-seccion text-2xl text-mist-50 sm:text-4xl">{moto.title}</h3>
            <p className="lineas-3 mt-3 text-sm leading-relaxed text-mist-400 sm:text-base">
              {moto.description}
            </p>
          </div>
        </div>

        {/* Flechas */}
        <button
          type="button"
          onClick={anterior}
          aria-label="Moto anterior"
          className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink-950/60 text-mist-200 opacity-0 backdrop-blur transition-all hover:border-brand-500 hover:text-brand-400 focus-visible:opacity-100 group-hover:opacity-100 sm:left-5"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            <path d="m12 4-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={siguiente}
          aria-label="Moto siguiente"
          className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ink-950/60 text-mist-200 opacity-0 backdrop-blur transition-all hover:border-brand-500 hover:text-brand-400 focus-visible:opacity-100 group-hover:opacity-100 sm:right-5"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            <path d="m8 4 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Indicadores */}
      <div className="flex items-center justify-between gap-4 border-t border-line bg-ink-900/70 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {bikes.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Ver ${item.title}`}
              aria-current={i === indice}
              className={`h-1.5 rounded-full transition-all duration-400 ${
                i === indice ? 'w-8 bg-brand-500' : 'w-3 bg-ink-600 hover:bg-mist-600'
              }`}
            />
          ))}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-mist-500">
          <span className="font-bold text-mist-50">{String(indice + 1).padStart(2, '0')}</span>
          {' / '}
          {String(bikes.length).padStart(2, '0')}
        </span>
      </div>

      {/* Barra de progreso del avance automático */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-ink-700" aria-hidden="true">
        <div
          key={`${indice}-${pausado}`}
          className="h-full bg-gradient-to-r from-brand-500 to-brand-300"
          style={{
            animation: pausado ? 'none' : `barra ${DURACION}ms linear forwards`,
          }}
        />
      </div>

      <style>{`@keyframes barra { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}
