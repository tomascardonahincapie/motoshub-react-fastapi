import { Link } from 'react-router-dom';
import ImagenSegura from './ImagenSegura';
import IconoWhatsApp from './IconoWhatsApp';
import { enlaceCompra, formatearPrecio } from '../config';

/**
 * Tarjeta del catálogo. Sirve igual para un producto y para un servicio:
 * ambos muestran foto, etiqueta, precio y un botón que abre WhatsApp con el
 * mensaje de compra ya escrito.
 */
export default function TarjetaCatalogo({ item, tipo = 'producto', className = '', retardo = 0 }) {
  const esServicio = tipo === 'servicio';
  const id = esServicio ? item.id_servicio : item.id_producto;
  const rutaDetalle = esServicio ? `/catalogo/servicio/${id}` : `/catalogo/producto/${id}`;

  const etiqueta = esServicio ? 'Servicio' : item.categoria;
  const agotado = !esServicio && item.stock <= 0;

  return (
    <article
      style={retardo ? { animationDelay: `${retardo}ms` } : undefined}
      className={`grupo-tarjeta tarjeta tarjeta-interactiva flex flex-col ${className}`}
    >
      <Link to={rutaDetalle} className="marco-imagen velo-inferior block aspect-[4/3] w-full">
        <ImagenSegura
          src={item.imagen}
          alt={item.nombre}
          icono={esServicio ? '🔧' : '🏍️'}
          className="h-full w-full object-cover"
        />

        {etiqueta && (
          <span className="etiqueta etiqueta-marca absolute left-3 top-3 z-10 backdrop-blur-sm">
            {etiqueta}
          </span>
        )}

        {agotado && (
          <span className="etiqueta etiqueta-peligro absolute right-3 top-3 z-10 backdrop-blur-sm">
            Agotado
          </span>
        )}

        {/* Precio sobre la foto, apoyado en el velo inferior */}
        <span className="absolute bottom-3 left-3 z-10 font-display text-2xl font-bold text-mist-50 drop-shadow">
          {formatearPrecio(item.precio)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link to={rutaDetalle}>
          <h3 className="lineas-2 font-display text-base font-semibold leading-snug text-mist-50 transition-colors hover:text-brand-400">
            {item.nombre}
          </h3>
        </Link>

        {item.descripcion && (
          <p className="lineas-2 mt-1.5 text-[0.8rem] leading-relaxed text-mist-500">{item.descripcion}</p>
        )}

        <p className="mt-3 flex items-center gap-1.5 text-[0.72rem] uppercase tracking-wider text-mist-600">
          {esServicio ? (
            item.duracion_minutos ? (
              <>
                <span aria-hidden="true">⏱</span> {item.duracion_minutos} minutos
              </>
            ) : (
              <>
                <span aria-hidden="true">⏱</span> Duración a convenir
              </>
            )
          ) : agotado ? (
            <span className="text-danger-400">Sin unidades disponibles</span>
          ) : (
            <>
              <span aria-hidden="true">📦</span> {item.stock} disponibles
            </>
          )}
        </p>

        <div className="mt-4 flex gap-2 pt-1">
          <Link to={rutaDetalle} className="btn btn-fantasma flex-1 !px-3 !text-[0.7rem]">
            Ver detalle
          </Link>
          <a
            href={enlaceCompra(item, tipo)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp flex-1 !px-3 !text-[0.7rem]"
            aria-label={`${esServicio ? 'Agendar' : 'Comprar'} ${item.nombre} por WhatsApp`}
          >
            <IconoWhatsApp className="h-3.5 w-3.5" />
            {esServicio ? 'Agendar' : 'Comprar'}
          </a>
        </div>
      </div>
    </article>
  );
}
