import { useId, useMemo, useState } from 'react';
import { Cabecera, Globo, PanelVacio } from './GraficoBarras';
import { abreviar, marcas, saltoDeEtiquetas, topeAgradable } from './ejes';

const ANCHO = 760;
const ALTO = 280;
const MARGEN = { arriba: 16, derecha: 14, abajo: 34, izquierda: 58 };

/**
 * Gráfico lineal con área bajo la curva.
 *
 * Comparte la serie con el gráfico de barras: la de barras se lee mejor para
 * comparar periodos sueltos y esta para ver la tendencia.
 */
export default function GraficoLineas({
  datos = [],
  titulo,
  descripcion,
  formato = (v) => v,
  etiquetaValor = 'Total',
  campo = 'total',
}) {
  const degradado = useId();
  const [activa, setActiva] = useState(null);

  const { puntos, area, tope, paso, lienzoAlto } = useMemo(() => {
    const valores = datos.map((d) => Number(d[campo]) || 0);
    const limite = topeAgradable(Math.max(...valores, 0));
    const util = ANCHO - MARGEN.izquierda - MARGEN.derecha;
    const alto = ALTO - MARGEN.arriba - MARGEN.abajo;

    // Con un solo punto no hay recta que trazar: se dibuja centrado.
    const separacion = datos.length > 1 ? util / (datos.length - 1) : util / 2;

    const coordenadas = datos.map((dato, indice) => ({
      x: MARGEN.izquierda + separacion * (datos.length > 1 ? indice : 1),
      y: MARGEN.arriba + alto - (limite > 0 ? ((Number(dato[campo]) || 0) / limite) * alto : 0),
    }));

    // El área se cierra bajando a la base por los dos extremos.
    const base = MARGEN.arriba + alto;
    const recorrido = coordenadas.map((p) => `L ${p.x},${p.y}`).join(' ');
    const primera = coordenadas[0];
    const ultima = coordenadas[coordenadas.length - 1];

    return {
      puntos: coordenadas,
      tope: limite,
      paso: separacion,
      lienzoAlto: alto,
      area: coordenadas.length
        ? `M ${primera.x},${base} ${recorrido} L ${ultima.x},${base} Z`
        : '',
    };
  }, [datos, campo]);

  const salto = saltoDeEtiquetas(datos.length);

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
          aria-label={`${titulo}. Tendencia de ${datos.length} periodos.`}
          onMouseLeave={() => setActiva(null)}
        >
          <defs>
            <linearGradient id={degradado} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.34" />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
            </linearGradient>
          </defs>

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

          <path d={area} fill={`url(#${degradado})`} className="area-grafico" />
          <polyline
            points={puntos.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="var(--color-brand-500)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="linea-grafico"
          />

          {/* Marcador vertical del punto bajo el ratón */}
          {activa !== null && (
            <line
              x1={puntos[activa].x} y1={MARGEN.arriba}
              x2={puntos[activa].x} y2={MARGEN.arriba + lienzoAlto}
              stroke="var(--color-brand-500)" strokeWidth="1" strokeDasharray="3 4" opacity="0.6"
            />
          )}

          {puntos.map((p, indice) => (
            <g key={datos[indice].periodo} onMouseEnter={() => setActiva(indice)}>
              <rect
                x={p.x - paso / 2} y={MARGEN.arriba}
                width={paso} height={lienzoAlto} fill="transparent"
              />
              <circle
                cx={p.x} cy={p.y}
                r={activa === indice ? 5.5 : 3}
                fill={activa === indice ? 'var(--color-brand-400)' : 'var(--color-ink-950)'}
                stroke="var(--color-brand-500)"
                strokeWidth="2"
              />
              {indice % salto === 0 && (
                <text
                  x={p.x} y={ALTO - 12} textAnchor="middle"
                  className={activa === indice ? 'fill-mist-200 text-[11px]' : 'fill-mist-600 text-[11px]'}
                >
                  {datos[indice].etiqueta}
                </text>
              )}
            </g>
          ))}
        </svg>

        {punto && (
          <Globo
            posicion={puntos[activa].x / ANCHO}
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
