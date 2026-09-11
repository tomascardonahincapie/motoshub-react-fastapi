import { useEffect, useState } from 'react';

/**
 * Imagen que nunca deja un hueco roto.
 *
 * Mientras carga muestra un degradado animado y, si la URL falla o viene
 * vacía, dibuja un marcador en lugar del icono de imagen rota del navegador.
 * Así el catálogo se ve completo aunque alguien guarde un enlace incorrecto.
 *
 * Importante: la imagen nunca se oculta con `display:none` mientras carga,
 * porque una imagen con `loading="lazy"` que no se renderiza jamás dispara su
 * evento `load`. En su lugar se le aplica el fondo del esqueleto, que se
 * retira cuando la foto termina de pintarse.
 */
export default function ImagenSegura({ src, alt, className = '', icono = '🏍️' }) {
  const [estado, setEstado] = useState(src ? 'cargando' : 'error');

  // Al navegar entre productos cambia el src: reiniciamos el estado.
  useEffect(() => {
    setEstado(src ? 'cargando' : 'error');
  }, [src]);

  if (estado === 'error') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 bg-ink-800 text-mist-600 ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="text-2xl opacity-40" aria-hidden="true">{icono}</span>
        <span className="px-2 text-center text-[0.6rem] font-semibold uppercase tracking-widest">
          Sin imagen
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={() => setEstado('listo')}
      onError={() => setEstado('error')}
      className={`${className} ${estado === 'cargando' ? 'esqueleto' : ''}`}
    />
  );
}
