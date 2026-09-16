import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ImagenSegura from '../components/ImagenSegura';
import IconoWhatsApp from '../components/IconoWhatsApp';
import TarjetaCatalogo from '../components/TarjetaCatalogo';
import { useCarrito } from '../context/CarritoContext';
import { api } from '../utils/api';
import { enlaceCompra, formatearPrecio } from '../config';

/**
 * Ficha de un producto o de un servicio. Ambos comparten la misma plantilla:
 * foto grande, precio, datos y el botón que abre WhatsApp para comprar o
 * agendar. Solo cambian los campos propios de cada entidad.
 */
export default function DetalleCatalogo({ tipo = 'producto' }) {
  const { id } = useParams();
  const { agregar } = useCarrito();
  const esServicio = tipo === 'servicio';

  const [item, setItem] = useState(null);
  const [relacionados, setRelacionados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setCargando(true);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const consulta = esServicio ? api.getServicio(id) : api.getProducto(id);

    consulta
      .then((datos) => setItem(esServicio ? datos.servicio : datos.producto))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [id, esServicio]);

  // Sugerencias: misma categoría en productos, otros servicios en servicios.
  useEffect(() => {
    if (!item) return;
    const consulta = esServicio ? api.getServicios() : api.getProductos();

    consulta
      .then((datos) => {
        const lista = (esServicio ? datos.servicios : datos.productos) || [];
        const idActual = esServicio ? item.id_servicio : item.id_producto;
        const clave = esServicio ? 'id_servicio' : 'id_producto';

        setRelacionados(
          lista
            .filter((otro) => otro.estado !== 'inactivo' && otro[clave] !== idActual)
            .filter((otro) => (esServicio ? true : otro.categoria === item.categoria))
            .slice(0, 4),
        );
      })
      .catch(() => setRelacionados([]));
  }, [item, esServicio]);

  if (cargando) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="esqueleto aspect-[4/3] w-full rounded-2xl" />
          <div className="space-y-4 py-4">
            <div className="esqueleto h-5 w-28" />
            <div className="esqueleto h-10 w-3/4" />
            <div className="esqueleto h-8 w-40" />
            <div className="esqueleto h-24 w-full" />
            <div className="esqueleto h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="text-5xl opacity-30" aria-hidden="true">🔍</p>
        <h1 className="titulo-seccion mt-5 text-2xl">
          {esServicio ? 'Servicio no encontrado' : 'Producto no encontrado'}
        </h1>
        <p className="mt-2 text-sm text-mist-500">{error || 'Puede que ya no esté disponible.'}</p>
        <Link to="/catalogo" className="btn btn-primario mt-7 w-auto">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const agotado = !esServicio && item.stock <= 0;

  // Fichas de datos, distintas según el tipo.
  const datos = esServicio
    ? [
        { etiqueta: 'Duración', valor: item.duracion_minutos ? `${item.duracion_minutos} min` : 'A convenir', icono: '⏱' },
        { etiqueta: 'Modalidad', valor: 'Con cita previa', icono: '📅' },
        { etiqueta: 'Estado', valor: 'Disponible', icono: '✅' },
      ]
    : [
        { etiqueta: 'Disponibilidad', valor: agotado ? 'Agotado' : `${item.stock} unidades`, icono: '📦' },
        { etiqueta: 'Categoría', valor: item.categoria || 'General', icono: '🏷️' },
        { etiqueta: 'Garantía', valor: 'Incluida', icono: '🛡️' },
      ];

  return (
    <div className="animate-aparecer">
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Ruta de migas */}
        <nav className="mb-7 flex items-center gap-2 text-xs text-mist-600" aria-label="Ruta">
          <Link to="/" className="transition-colors hover:text-brand-400">Inicio</Link>
          <span aria-hidden="true">/</span>
          <Link to="/catalogo" className="transition-colors hover:text-brand-400">Catálogo</Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-mist-400">{item.nombre}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Foto */}
          <div className="tarjeta marco-imagen aspect-[4/3] w-full self-start sombra-profunda">
            <ImagenSegura
              src={item.imagen}
              alt={item.nombre}
              icono={esServicio ? '🔧' : '🏍️'}
              className="h-full w-full object-cover"
            />
            <span className="etiqueta etiqueta-marca absolute left-4 top-4 backdrop-blur-sm">
              {esServicio ? 'Servicio de taller' : item.categoria || 'Producto'}
            </span>
          </div>

          {/* Información */}
          <div className="animate-subir">
            <h1 className="titulo-seccion text-3xl leading-tight sm:text-4xl">{item.nombre}</h1>

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <p className="font-display text-4xl font-bold text-brand-400">
                {formatearPrecio(item.precio)}
              </p>
              {agotado ? (
                <span className="etiqueta etiqueta-peligro">Sin stock</span>
              ) : (
                <span className="etiqueta etiqueta-ok">Disponible</span>
              )}
            </div>

            {item.descripcion && (
              <p className="mt-5 leading-relaxed text-mist-400">{item.descripcion}</p>
            )}

            {/* Fichas de datos */}
            <div className="mt-7 grid grid-cols-3 gap-3">
              {datos.map((dato) => (
                <div key={dato.etiqueta} className="superficie px-3 py-3.5 text-center">
                  <span className="text-lg" aria-hidden="true">{dato.icono}</span>
                  <p className="mt-1 text-[0.62rem] uppercase tracking-wider text-mist-600">
                    {dato.etiqueta}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-mist-100">{dato.valor}</p>
                </div>
              ))}
            </div>

            {/* Acciones */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => agregar(item, tipo)}
                disabled={agotado}
                className="btn btn-primario flex-1"
              >
                {esServicio ? 'Agendar este servicio' : 'Añadir al carrito'}
              </button>
              <a
                href={enlaceCompra(item, tipo)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp flex-1"
              >
                <IconoWhatsApp className="h-4 w-4" />
                Consultar por WhatsApp
              </a>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Link to="/catalogo" className="btn btn-fantasma flex-1">
                Seguir viendo el catálogo
              </Link>
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-mist-600 sm:text-left">
              Al confirmar la compra desde el carrito se registra la venta y se emite tu
              factura, que puedes descargar en PDF desde tu panel.
            </p>
          </div>
        </div>
      </section>

      {/* Relacionados */}
      {relacionados.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <h2 className="titulo-seccion mb-6 text-xl sm:text-2xl">
            {esServicio ? 'Otros servicios' : 'Productos similares'}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relacionados.map((otro, i) => (
              <TarjetaCatalogo
                key={esServicio ? otro.id_servicio : otro.id_producto}
                item={otro}
                tipo={tipo}
                className="animate-subir"
                retardo={i * 60}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
