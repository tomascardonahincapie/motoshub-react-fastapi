import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TarjetaCatalogo from '../components/TarjetaCatalogo';
import IconoWhatsApp from '../components/IconoWhatsApp';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { NEGOCIO, enlaceWhatsApp } from '../config';

export default function ClientPanel() {
  const { usuario } = useAuth();
  const [pestana, setPestana] = useState('productos');
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([api.getProductos(), api.getServicios()])
      .then(([p, s]) => {
        setProductos((p.productos || []).filter((item) => item.estado !== 'inactivo'));
        setServicios((s.servicios || []).filter((item) => item.estado !== 'inactivo'));
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const datosCuenta = [
    { etiqueta: 'Nombre completo', valor: `${usuario.nombres} ${usuario.apellidos}` },
    { etiqueta: 'Correo', valor: usuario.email },
    { etiqueta: 'Documento', valor: `${usuario.tipo_documento} ${usuario.numero_documento}` },
    { etiqueta: 'Teléfono', valor: usuario.telefono || '—' },
    { etiqueta: 'Dirección', valor: usuario.direccion || '—' },
    { etiqueta: 'Rol', valor: usuario.nombre_rol },
  ];

  const destacados = (pestana === 'productos' ? productos : servicios).slice(0, 4);

  return (
    <div className="animate-aparecer">
      {/* Saludo */}
      <section className="relative overflow-hidden px-5 pb-6 pt-12 sm:px-8">
        <div className="halo -left-10 top-0 h-56 w-56 bg-brand-500/12" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl">
          <span className="etiqueta etiqueta-neutra mb-3">Mi cuenta</span>
          <h1 className="titulo-seccion text-3xl sm:text-4xl">
            Hola, <span className="texto-degradado">{usuario.nombres}</span>
          </h1>
          <p className="mt-2 text-sm text-mist-400">
            Aquí tienes tus datos y el catálogo disponible para ti.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        {/* Datos de la cuenta */}
        <div className="tarjeta animate-subir p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-display text-lg font-black text-white">
              {(usuario.nombres[0] + (usuario.apellidos?.[0] || '')).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-semibold text-mist-50">
                {usuario.nombres} {usuario.apellidos}
              </h2>
              <p className="truncate text-sm text-mist-500">{usuario.email}</p>
            </div>
            <span className="etiqueta etiqueta-ok ml-auto hidden sm:inline-flex">Cuenta activa</span>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-3">
            {datosCuenta.map((dato) => (
              <div key={dato.etiqueta}>
                <dt className="text-[0.65rem] uppercase tracking-wider text-mist-600">{dato.etiqueta}</dt>
                <dd className="mt-0.5 truncate text-sm text-mist-100">{dato.valor}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Atajos */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Link to="/catalogo" className="tarjeta tarjeta-interactiva flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/12 text-lg">🛒</span>
            <div>
              <p className="text-sm font-semibold text-mist-50">Ver catálogo</p>
              <p className="text-xs text-mist-600">{productos.length} productos</p>
            </div>
          </Link>

          <Link to="/catalogo" className="tarjeta tarjeta-interactiva flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-400/12 text-lg">🔧</span>
            <div>
              <p className="text-sm font-semibold text-mist-50">Servicios de taller</p>
              <p className="text-xs text-mist-600">{servicios.length} disponibles</p>
            </div>
          </Link>

          <a
            href={enlaceWhatsApp(`Hola ${NEGOCIO.nombre}, soy ${usuario.nombres} ${usuario.apellidos} y necesito ayuda con mi cuenta.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="tarjeta tarjeta-interactiva flex items-center gap-3 p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ok-500/12 text-ok-400">
              <IconoWhatsApp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-mist-50">Necesito ayuda</p>
              <p className="text-xs text-mist-600">Escríbenos por WhatsApp</p>
            </div>
          </a>
        </div>

        {/* Catálogo disponible */}
        <div className="mt-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="titulo-seccion text-xl sm:text-2xl">Disponible para ti</h2>
            <div className="inline-flex gap-1 rounded-xl border border-line bg-ink-900/70 p-1">
              {[
                { valor: 'productos', etiqueta: 'Productos', total: productos.length },
                { valor: 'servicios', etiqueta: 'Servicios', total: servicios.length },
              ].map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => setPestana(opcion.valor)}
                  className={`rounded-lg px-4 py-2 text-[0.72rem] font-bold uppercase tracking-wider transition-all ${
                    pestana === opcion.valor
                      ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'
                      : 'text-mist-400 hover:bg-white/5 hover:text-mist-50'
                  }`}
                >
                  {opcion.etiqueta}
                  <span className="ml-1.5 opacity-70">{opcion.total}</span>
                </button>
              ))}
            </div>
          </div>

          {cargando ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="esqueleto h-72 w-full" />
              ))}
            </div>
          ) : destacados.length === 0 ? (
            <p className="superficie py-14 text-center text-sm text-mist-600">
              Aún no hay {pestana} disponibles.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {destacados.map((item, i) => (
                <TarjetaCatalogo
                  key={pestana === 'productos' ? item.id_producto : item.id_servicio}
                  item={item}
                  tipo={pestana === 'productos' ? 'producto' : 'servicio'}
                  className="animate-subir"
                  retardo={i * 60}
                />
              ))}
            </div>
          )}

          <div className="mt-7 text-center">
            <Link to="/catalogo" className="btn btn-secundario w-auto">
              Ver todo el catálogo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
