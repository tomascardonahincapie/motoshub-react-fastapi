import { useId, useMemo, useState } from 'react';
import { abreviar, marcas, saltoDeEtiquetas, topeAgradable } from './ejes';

const ANCHO = 760;
const ALTO = 280;
const MARGEN = { arriba: 14, derecha: 10, abajo: 34, izquierda: 58 };

/**
 * Gráfico de barras en SVG puro.
 *
 * Está hecho a mano y no con una librería para que herede los colores del
 * sistema de diseño y no sume otro paquete al bundle. Los datos llegan desde
 * FastAPI: aquí no hay ningún número escrito a mano.
 */
export default function GraficoBarras({
  datos = [],
  titulo,
  descripcion,
  formato = (v) => v,
  etiquetaValor = 'Total',
  campo = 'total',
}) {
  const degradado = useId();
  const [activa, setActiva] = useState(null);

  const { tope, paso, lienzoAlto } = useMemo(() => {
    const valores = datos.map((d) => Number(d[campo]) || 0);
    const limite = topeAgradable(Math.max(...valores, 0));
    const util = ANCHO - MARGEN.izquierda - MARGEN.derecha;

    return {
      tope: limite,
      paso: datos.length > 0 ? util / datos.length : util,
      lienzoAlto: ALTO - MARGEN.arriba - MARGEN.abajo,
    };
  }, [datos, campo]);

  const salto = saltoDeEtiquetas(datos.length);
  const anchoBarra = Math.max(3, Math.min(paso * 0.62, 46));

  if (datos.length === 0) {
    return <PanelVacio titulo={titulo} descripcion={descripcion} />;
  }

  const punto = activa !== null ? datos[activa] : null;

  return (
    <section className="tarjeta p-5">
      <Cabecera titulo={titulo} descripcion={descripcion} />

      <div className="relative mt-5">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="w-full"
          role="img"
          aria-label={`${titulo}. ${datos.length} periodos.`}
          onMouseLeave={() => setActiva(null)}
        >
          <defs>
            <linearGradient id={degradado} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-400)" />
              <stop offset="100%" stopColor="var(--color-brand-600)" stopOpacity="0.72" />
            </linearGradient>
          </defs>

          {/* Líneas de referencia y escala vertical */}
          {marcas(tope).map((valor, i, todas) => {
            const y = MARGEN.arriba + (lienzoAlto * i) / (todas.length - 1);
            return (
              <g key={valor}>
                <line
                  x1={MARGEN.izquierda} y1={y} x2={ANCHO - MARGEN.derecha} y2={y}
                  stroke="var(--color-line)" strokeWidth="1"
                  strokeDasharray={i === todas.length - 1 ? '0' : '4 6'}
                />
                <text
                  x={MARGEN.izquierda - 10} y={y + 4} textAnchor="end"
                  className="fill-mist-600 text-[11px] tabular-nums"
                >
                  {abreviar(valor)}
                </text>
              </g>
            );
          })}

          {/* Barras */}
          {datos.map((dato, indice) => {
            const valor = Number(dato[campo]) || 0;
            const altura = tope > 0 ? (valor / tope) * lienzoAlto : 0;
            const centro = MARGEN.izquierda + paso * indice + paso / 2;
            const y = MARGEN.arriba + lienzoAlto - altura;
            const resaltada = activa === indice;

            return (
              <g key={dato.periodo} onMouseEnter={() => setActiva(indice)}>
                {/* Franja invisible: da margen al ratón aunque la barra sea mínima */}
                <rect
                  x={centro - paso / 2} y={MARGEN.arriba}
                  width={paso} height={lienzoAlto}
                  fill="transparent"
                />
                {resaltada && (
                  <rect
                    x={centro - paso / 2} y={MARGEN.arriba}
                    width={paso} height={lienzoAlto}
                    fill="var(--color-brand-500)" opacity="0.07" rx="6"
                  />
                )}
                <rect
                  x={centro - anchoBarra / 2}
                  y={altura > 0 ? y : MARGEN.arriba + lienzoAlto - 2}
                  width={anchoBarra}
                  height={altura > 0 ? altura : 2}
                  rx={Math.min(5, anchoBarra / 2)}
                  fill={altura > 0 ? `url(#${degradado})` : 'var(--color-ink-700)'}
                  className="barra-grafico"
                  style={{ animationDelay: `${Math.min(indice * 22, 500)}ms` }}
                  opacity={resaltada || activa === null ? 1 : 0.45}
                />
                {indice % salto === 0 && (
                  <text
                    x={centro} y={ALTO - 12} textAnchor="middle"
                    className={resaltada ? 'fill-mist-200 text-[11px]' : 'fill-mist-600 text-[11px]'}
                  >
                    {dato.etiqueta}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {punto && (
          <Globo
            posicion={(MARGEN.izquierda + paso * activa + paso / 2) / ANCHO}
            etiqueta={punto.etiqueta}
            lineas={[
              `${etiquetaValor}: ${formato(punto[campo])}`,
              `${punto.cantidad} ${punto.cantidad === 1 ? 'venta' : 'ventas'}`,
            ]}
          />
        )}
      </div>
    </section>
  );
}

export function Cabecera({ titulo, descripcion, extra }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold text-mist-50">{titulo}</h3>
        {descripcion && <p className="mt-0.5 text-xs text-mist-500">{descripcion}</p>}
      </div>
      {extra}
    </header>
  );
}

export function Globo({ posicion, etiqueta, lineas }) {
  return (
    <div
      className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-lg border border-line-strong bg-ink-800/95 px-3 py-2 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.9)] backdrop-blur-sm"
      style={{ left: `${Math.min(Math.max(posicion * 100, 12), 88)}%` }}
    >
      <p className="text-[0.66rem] uppercase tracking-wider text-mist-500">{etiqueta}</p>
      {lineas.map((linea) => (
        <p key={linea} className="mt-0.5 whitespace-nowrap text-xs font-semibold text-mist-50">
          {linea}
        </p>
      ))}
    </div>
  );
}

export function PanelVacio({ titulo, descripcion }) {
  return (
    <section className="tarjeta p-5">
      <Cabecera titulo={titulo} descripcion={descripcion} />
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
        <span className="text-2xl opacity-40" aria-hidden="true">📊</span>
        <p className="text-sm text-mist-600">Todavía no hay datos en este rango.</p>
      </div>
    </section>
  );
}
