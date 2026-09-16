import { Link } from 'react-router-dom';
import ImagenSegura from './ImagenSegura';
import { useCarrito } from '../context/CarritoContext';
import IconoWhatsApp from './IconoWhatsApp';
import { enlaceCompra, formatearPrecio } from '../config';

/**
 * Tarjeta del catálogo. Sirve igual para un producto y para un servicio:
 * ambos muestran foto, etiqueta, precio y los botones para comprar.
 *
 * El botón principal añade el artículo al carrito, desde donde la compra se
 * registra como una venta real en la base de datos. El de WhatsApp se
 * conserva para quien prefiera cerrar el trato hablando con alguien.
 */
export default function TarjetaCatalogo({ item, tipo = 'producto', className = '', retardo = 0 }) {
  const esServicio = tipo === 'servicio';
  const id = esServicio ? item.id_servicio : item.id_producto;
  const rutaDetalle = esServicio ? `/catalogo/servicio/${id}` : `/catalogo/producto/${id}`;

  const { agregar } = useCarrito();

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
          <button
            type="button"
            onClick={() => agregar(item, tipo)}
            disabled={agotado}
            className="btn btn-primario flex-1 !px-3 !text-[0.7rem]"
            aria-label={`${esServicio ? 'Agendar' : 'Comprar'} ${item.nombre}`}
          >
            {esServicio ? 'Agendar' : 'Comprar'}
          </button>
          <a
            href={enlaceCompra(item, tipo)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp !w-auto !px-3"
            aria-label={`Consultar por ${item.nombre} en WhatsApp`}
            title="Consultar por WhatsApp"
          >
            <IconoWhatsApp className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
