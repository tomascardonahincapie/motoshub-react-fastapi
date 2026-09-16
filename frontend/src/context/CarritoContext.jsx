import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { IVA_PORCENTAJE } from '../config';

const CarritoContext = createContext(null);
const CLAVE = 'motoshub_carrito';

/** Un producto y un servicio pueden compartir el mismo id: la clave los separa. */
const claveDe = (item) => `${item.tipo}-${item.id}`;

function leerGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
}

/**
 * Carrito de compras del sitio público.
 *
 * Guarda solo lo imprescindible de cada artículo (id, tipo, nombre, precio) y
 * sobrevive a una recarga de la página. El precio que se muestra aquí es una
 * previsualización: el total que vale es el que calcula FastAPI al registrar
 * la venta, que lee los precios de la base de datos.
 */
export function CarritoProvider({ children }) {
  const [items, setItems] = useState(leerGuardado);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    localStorage.setItem(CLAVE, JSON.stringify(items));
  }, [items]);

  const agregar = useCallback((articulo, tipo, cantidad = 1) => {
    const nuevo = {
      tipo,
      id: tipo === 'producto' ? articulo.id_producto : articulo.id_servicio,
      nombre: articulo.nombre,
      precio: Number(articulo.precio),
      imagen: articulo.imagen || null,
      // Los servicios no tienen existencias: se pueden agendar sin límite.
      stock: tipo === 'producto' ? Number(articulo.stock ?? 0) : null,
    };

    setItems((previos) => {
      const existente = previos.find((i) => claveDe(i) === claveDe(nuevo));
      if (!existente) return [...previos, { ...nuevo, cantidad }];

      const tope = existente.stock ?? Infinity;
      return previos.map((i) =>
        claveDe(i) === claveDe(nuevo)
          ? { ...i, cantidad: Math.min(i.cantidad + cantidad, tope) }
          : i,
      );
    });

    setAbierto(true);
  }, []);

  const cambiarCantidad = useCallback((clave, cantidad) => {
    setItems((previos) =>
      previos
        .map((i) => {
          if (claveDe(i) !== clave) return i;
          const tope = i.stock ?? 99;
          return { ...i, cantidad: Math.max(1, Math.min(cantidad, tope)) };
        })
        .filter((i) => i.cantidad > 0),
    );
  }, []);

  const quitar = useCallback((clave) => {
    setItems((previos) => previos.filter((i) => claveDe(i) !== clave));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const totales = useMemo(() => {
    const subtotal = items.reduce((suma, i) => suma + i.precio * i.cantidad, 0);
    const impuestos = Math.round((subtotal * IVA_PORCENTAJE) / 100);
    return {
      subtotal,
      impuestos,
      total: subtotal + impuestos,
      unidades: items.reduce((suma, i) => suma + i.cantidad, 0),
    };
  }, [items]);

  /** Lo que espera POST /api/ventas: solo qué se compra y cuánto. */
  const comoPeticion = useCallback(
    () => items.map((i) => ({ tipo_item: i.tipo, id_item: i.id, cantidad: i.cantidad })),
    [items],
  );

  const valor = {
    items,
    abierto,
    totales,
    abrir: () => setAbierto(true),
    cerrar: () => setAbierto(false),
    agregar,
    quitar,
    cambiarCantidad,
    vaciar,
    comoPeticion,
    claveDe,
  };

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const contexto = useContext(CarritoContext);
  if (!contexto) throw new Error('useCarrito debe usarse dentro de un <CarritoProvider>');
  return contexto;
}
