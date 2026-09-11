import { useEffect, useMemo, useState } from 'react';
import TarjetaCatalogo from '../components/TarjetaCatalogo';
import { api } from '../utils/api';

const TODAS = 'Todas';

/** Tarjetas grises mientras llega la respuesta del Backend. */
function EsqueletoTarjetas({ cantidad = 6 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="tarjeta overflow-hidden">
          <div className="esqueleto aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2.5 p-4">
            <div className="esqueleto h-4 w-3/4" />
            <div className="esqueleto h-3 w-full" />
            <div className="esqueleto h-3 w-2/3" />
            <div className="esqueleto mt-3 h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Catalogo() {
  const [pestana, setPestana] = useState('productos');
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState(TODAS);
  const [orden, setOrden] = useState('recientes');

  useEffect(() => {
    Promise.all([api.getProductos(), api.getServicios()])
      .then(([p, s]) => {
        setProductos((p.productos || []).filter((item) => item.estado !== 'inactivo'));
        setServicios((s.servicios || []).filter((item) => item.estado !== 'inactivo'));
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  const categorias = useMemo(() => {
    const unicas = new Set(productos.map((p) => p.categoria).filter(Boolean));
    return [TODAS, ...Array.from(unicas).sort()];
  }, [productos]);

  // Filtra y ordena la pestaña activa.
  const visibles = useMemo(() => {
    const origen = pestana === 'productos' ? productos : servicios;
    const aguja = busqueda.trim().toLowerCase();

    let resultado = origen.filter((item) => {
      const coincideTexto =
        !aguja ||
        item.nombre.toLowerCase().includes(aguja) ||
        (item.descripcion || '').toLowerCase().includes(aguja);
      const coincideCategoria =
        pestana === 'servicios' || categoria === TODAS || item.categoria === categoria;
      return coincideTexto && coincideCategoria;
    });

    resultado = [...resultado].sort((a, b) => {
      if (orden === 'precio-asc') return Number(a.precio) - Number(b.precio);
      if (orden === 'precio-desc') return Number(b.precio) - Number(a.precio);
      if (orden === 'nombre') return a.nombre.localeCompare(b.nombre, 'es');
      return 0; // el Backend ya devuelve del más reciente al más antiguo
    });

    return resultado;
  }, [pestana, productos, servicios, busqueda, categoria, orden]);

  const cambiarPestana = (valor) => {
    setPestana(valor);
    setBusqueda('');
    setCategoria(TODAS);
  };

  return (
    <div className="animate-aparecer">
      {/* Encabezado */}
      <section className="relative overflow-hidden px-5 pb-8 pt-14 sm:px-8">
        <div className="halo left-1/3 top-0 h-64 w-64 bg-brand-500/12" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl text-center">
          <span className="etiqueta etiqueta-marca mb-4">Tienda y taller</span>
          <h1 className="titulo-seccion text-3xl sm:text-5xl">
            Nuestro <span className="texto-degradado">catálogo</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-mist-400 sm:text-base">
            Motos, repuestos y accesorios listos para entrega, y servicios de taller que
            puedes agendar por WhatsApp en un par de clics.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {/* Pestañas */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex gap-1 rounded-xl border border-line bg-ink-900/70 p-1">
            {[
              { valor: 'productos', etiqueta: 'Productos', total: productos.length },
              { valor: 'servicios', etiqueta: 'Servicios', total: servicios.length },
            ].map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => cambiarPestana(opcion.valor)}
                className={`rounded-lg px-5 py-2.5 text-[0.78rem] font-bold uppercase tracking-wider transition-all ${
                  pestana === opcion.valor
                    ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-[0_8px_20px_-10px_rgba(255,92,26,0.9)]'
                    : 'text-mist-400 hover:bg-white/5 hover:text-mist-50'
                }`}
              >
                {opcion.etiqueta}
                <span className="ml-2 text-[0.7rem] opacity-70">{opcion.total}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Barra de filtros */}
        <div className="superficie mb-8 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-600">
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={pestana === 'productos' ? 'Buscar una moto, casco, repuesto...' : 'Buscar un servicio...'}
              aria-label="Buscar en el catálogo"
              className="campo pl-9"
            />
          </div>

          {pestana === 'productos' && (
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              aria-label="Filtrar por categoría"
              className="campo cursor-pointer sm:w-48"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === TODAS ? 'Todas las categorías' : cat}
                </option>
              ))}
            </select>
          )}

          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            aria-label="Ordenar"
            className="campo cursor-pointer sm:w-44"
          >
            <option value="recientes">Más recientes</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre (A-Z)</option>
          </select>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-danger-500/30 bg-danger-500/10 p-4 text-center text-sm text-danger-400">
            {error}
          </div>
        )}

        {/* Resultados */}
        {cargando ? (
          <EsqueletoTarjetas />
        ) : visibles.length === 0 ? (
          <div className="superficie py-20 text-center">
            <p className="text-4xl opacity-30" aria-hidden="true">🔍</p>
            <p className="mt-4 font-display text-lg text-mist-200">Sin resultados</p>
            <p className="mt-1 text-sm text-mist-500">
              {busqueda || categoria !== TODAS
                ? 'Prueba con otra búsqueda o quita los filtros.'
                : `Aún no hay ${pestana} disponibles.`}
            </p>
            {(busqueda || categoria !== TODAS) && (
              <button
                type="button"
                onClick={() => {
                  setBusqueda('');
                  setCategoria(TODAS);
                }}
                className="btn btn-secundario mt-5 w-auto"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs uppercase tracking-wider text-mist-600">
              {visibles.length} {visibles.length === 1 ? 'resultado' : 'resultados'}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibles.map((item, i) => (
                <TarjetaCatalogo
                  key={pestana === 'productos' ? item.id_producto : item.id_servicio}
                  item={item}
                  tipo={pestana === 'productos' ? 'producto' : 'servicio'}
                  className="animate-subir"
                  retardo={Math.min(i, 8) * 55}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
