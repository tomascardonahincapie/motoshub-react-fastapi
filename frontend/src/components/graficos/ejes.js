// Cálculos que comparten el gráfico de barras y el gráfico lineal.

/**
 * Redondea el máximo hacia arriba hasta una cifra "redonda".
 *
 * Con un máximo de 3.470.000 el eje llegaría a 3.470.000 y las líneas de
 * referencia quedarían en números ilegibles. Así sube a 4.000.000 y los
 * cuatro tramos caen en 1, 2 y 3 millones.
 */
export function topeAgradable(maximo) {
  if (maximo <= 0) return 1;

  const magnitud = 10 ** Math.floor(Math.log10(maximo));
  const normalizado = maximo / magnitud;
  const escalon = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((paso) => normalizado <= paso) ?? 10;

  return escalon * magnitud;
}

/** Valores de las líneas horizontales de referencia, de arriba hacia abajo. */
export function marcas(tope, cantidad = 4) {
  return Array.from({ length: cantidad + 1 }, (_, i) => (tope * (cantidad - i)) / cantidad);
}

/** Abrevia importes grandes para el eje vertical: 3500000 -> "3,5 M". */
export function abreviar(valor) {
  const numero = Number(valor) || 0;
  if (Math.abs(numero) >= 1_000_000) {
    return `${(numero / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  }
  if (Math.abs(numero) >= 1000) {
    return `${Math.round(numero / 1000)} k`;
  }
  return String(Math.round(numero));
}

/**
 * Cada cuántas etiquetas se escribe una en el eje horizontal.
 *
 * Con treinta días no caben treinta fechas: se escribe una de cada tres y el
 * resto se lee al pasar el ratón por encima.
 */
export function saltoDeEtiquetas(cantidad, maximoVisible = 12) {
  return Math.max(1, Math.ceil(cantidad / maximoVisible));
}
