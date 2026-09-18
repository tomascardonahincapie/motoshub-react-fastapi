import { useCallback, useEffect, useRef } from 'react';

/**
 * Descarta las respuestas que llegan tarde.
 *
 * Los paneles vuelven a consultar el Backend cada vez que cambia un filtro.
 * Si se cambian dos seguidos, quedan dos peticiones en vuelo y no hay garantía
 * de que respondan en orden: si la primera llega de última, pisa el resultado
 * de la segunda y la pantalla acaba mostrando datos que no corresponden a los
 * filtros que se ven.
 *
 * Cada llamada recibe un número; solo se aplica el resultado de la última.
 *
 * Uso:
 *   const vigente = usePeticionVigente();
 *   const cargar = useCallback(async () => {
 *     const esVigente = vigente();
 *     const datos = await api.loQueSea(filtros, token);
 *     if (esVigente()) setDatos(datos);
 *   }, [filtros, token, vigente]);
 */
export function usePeticionVigente() {
  const contador = useRef(0);
  const montado = useRef(true);

  // Tampoco tiene sentido pintar el resultado si el componente ya se fue.
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  return useCallback(() => {
    contador.current += 1;
    const mia = contador.current;
    return () => montado.current && contador.current === mia;
  }, []);
}
