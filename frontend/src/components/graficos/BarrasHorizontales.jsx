import { Cabecera } from './GraficoBarras';

const COLORES = [
  'bg-brand-500', 'bg-info-400', 'bg-ok-500',
  'bg-warn-400', 'bg-danger-400', 'bg-mist-500',
];

/**
 * Reparto en barras horizontales: lo más vendido, las ventas por estado o
 * por forma de pago. Se compara contra el mayor de la lista, no contra el
 * total, para que la barra más alta llene siempre la fila.
 */
export default function BarrasHorizontales({
  datos = [],
  titulo,
  descripcion,
  campoEtiqueta = 'etiqueta',
  campoValor = 'cantidad',
  formatoValor = (v) => v,
  detalle,
  vacio = 'Todavía no hay datos.',
}) {
  const mayor = Math.max(...datos.map((d) => Number(d[campoValor]) || 0), 1);

  return (
    <section className="tarjeta p-5">
      <Cabecera titulo={titulo} descripcion={descripcion} />

      {datos.length === 0 ? (
        <p className="py-10 text-center text-sm text-mist-600">{vacio}</p>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {datos.map((fila, indice) => {
            const valor = Number(fila[campoValor]) || 0;
            const porcentaje = Math.round((valor / mayor) * 100);

            return (
              <li key={`${fila[campoEtiqueta]}-${indice}`}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate text-mist-300">{fila[campoEtiqueta]}</span>
                  <span className="shrink-0 tabular-nums text-mist-500">
                    {formatoValor(valor)}
                    {detalle && <span className="ml-1.5 text-mist-600">{detalle(fila)}</span>}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className={`h-full rounded-full ${COLORES[indice % COLORES.length]}`}
                    style={{
                      width: `${porcentaje}%`,
                      transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
