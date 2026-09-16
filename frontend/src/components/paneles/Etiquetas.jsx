// Etiquetas de estado compartidas por las tablas de ventas, facturas y PQR.

const VENTA = {
  pagada: 'etiqueta-ok',
  pendiente: 'etiqueta-marca',
  anulada: 'etiqueta-peligro',
};

const FACTURA = {
  pagada: 'etiqueta-ok',
  emitida: 'etiqueta-marca',
  anulada: 'etiqueta-peligro',
};

const PQR = {
  pendiente: 'etiqueta-peligro',
  en_proceso: 'etiqueta-marca',
  respondida: 'etiqueta-ok',
  cerrada: 'etiqueta-neutra',
};

const TEXTO_PQR = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  respondida: 'Respondida',
  cerrada: 'Cerrada',
};

const TIPO_PQR = {
  peticion: 'Petición',
  queja: 'Queja',
  reclamo: 'Reclamo',
  sugerencia: 'Sugerencia',
};

const PAGO = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  credito: 'Crédito',
};

export const textoTipoPqr = (tipo) => TIPO_PQR[tipo] || tipo;
export const textoMetodoPago = (metodo) => PAGO[metodo] || metodo;

export function EtiquetaVenta({ estado }) {
  return <span className={`etiqueta ${VENTA[estado] || 'etiqueta-neutra'}`}>{estado}</span>;
}

export function EtiquetaFactura({ estado }) {
  return <span className={`etiqueta ${FACTURA[estado] || 'etiqueta-neutra'}`}>{estado}</span>;
}

export function EtiquetaPqr({ estado }) {
  return (
    <span className={`etiqueta ${PQR[estado] || 'etiqueta-neutra'}`}>
      {TEXTO_PQR[estado] || estado}
    </span>
  );
}
