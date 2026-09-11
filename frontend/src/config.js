// ===========================================================================
// Configuración del negocio.
// Cambia aquí el número de WhatsApp y los datos de contacto: se usan en el
// botón flotante, en los botones de compra y en el pie de página.
// ===========================================================================

export const NEGOCIO = {
  nombre: 'MotosHub',
  // Formato internacional sin "+" ni espacios. 57 = Colombia.
  whatsapp: '573000000000',
  correo: 'contacto@motoshub.com',
  telefono: '+57 300 000 0000',
  direccion: 'Cra. 45 #12-30, Medellín, Colombia',
  horario: 'Lun a Vie 8:00 - 18:00 · Sáb 9:00 - 14:00',
};

/** Formatea un precio en pesos colombianos: 25500000 -> "$25.500.000" */
export function formatearPrecio(valor) {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '$0';
  return numero.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

/** Construye un enlace de WhatsApp con un mensaje ya redactado. */
export function enlaceWhatsApp(mensaje) {
  return `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Mensaje de compra para un producto o servicio del catálogo.
 * Ejemplo: "Hola MotosHub, quiero comprar el producto *Casco Integral* ($480.000)..."
 */
export function enlaceCompra(item, tipo = 'producto') {
  const accion = tipo === 'servicio' ? 'quiero agendar el servicio' : 'quiero comprar el producto';
  const mensaje =
    `Hola ${NEGOCIO.nombre}, ${accion} *${item.nombre}* (${formatearPrecio(item.precio)}). ` +
    '¿Me confirman disponibilidad y forma de pago?';
  return enlaceWhatsApp(mensaje);
}
