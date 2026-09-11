import { useEffect, useState } from 'react';
import IconoWhatsApp from './IconoWhatsApp';
import { NEGOCIO, enlaceWhatsApp } from '../config';

const MENSAJE_DEFECTO = `Hola ${NEGOCIO.nombre}, quiero más información sobre sus productos y servicios.`;

/**
 * Botón flotante de WhatsApp, visible en todo el sitio y con posición fija.
 * Funciona de forma independiente del Backend: es solo un enlace externo.
 */
export default function WhatsAppButton({ mensaje = MENSAJE_DEFECTO }) {
  const [visible, setVisible] = useState(false);

  // Entra con una pequeña animación tras cargar la página.
  useEffect(() => {
    const temporizador = setTimeout(() => setVisible(true), 550);
    return () => clearTimeout(temporizador);
  }, []);

  return (
    <a
      href={enlaceWhatsApp(mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className={`group fixed bottom-6 right-6 z-50 flex items-center gap-0 overflow-hidden rounded-full bg-gradient-to-br from-[#25d366] to-[#128c4a] py-3.5 pl-4 pr-4 text-white shadow-[0_12px_34px_-10px_rgba(37,211,102,0.75)] transition-all duration-500 hover:gap-2 hover:pr-5 hover:shadow-[0_16px_44px_-8px_rgba(37,211,102,0.9)] ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
    >
      {/* Anillo que late para llamar la atención sin ser intrusivo */}
      <span className="absolute inset-0 -z-10 animate-latido rounded-full bg-[#25d366]/40" aria-hidden="true" />

      <IconoWhatsApp className="h-6 w-6 shrink-0" />

      {/* El texto se despliega al pasar el cursor */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-bold opacity-0 transition-all duration-500 group-hover:max-w-[11rem] group-hover:opacity-100">
        Escríbenos
      </span>
    </a>
  );
}
