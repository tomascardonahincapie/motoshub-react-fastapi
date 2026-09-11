import { useCallback, useEffect, useState } from 'react';
import Aviso from '../components/Aviso';
import SeccionCatalogo from './admin/SeccionCatalogo';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { formatearPrecio } from '../config';

const PESTANAS = [
  { clave: 'productos', etiqueta: 'Productos', icono: '📦' },
  { clave: 'servicios', etiqueta: 'Servicios', icono: '🔧' },
];

export default function EmployeePanel() {
  const { usuario } = useAuth();

  const [pestana, setPestana] = useState('productos');
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const avisar = useCallback((texto) => {
    setError('');
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3500);
  }, []);

  const alFallar = useCallback((texto) => {
    setMensaje('');
    setError(texto);
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [p, s] = await Promise.all([api.getProductos(), api.getServicios()]);
      setProductos(p.productos || []);
      setServicios(s.servicios || []);
      setError('');
    } catch (err) {
      alFallar(err.message);
    } finally {
      setCargando(false);
    }
  }, [alFallar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const unidades = productos.reduce((suma, p) => suma + Number(p.stock || 0), 0);
  const valorInventario = productos.reduce(
    (suma, p) => suma + Number(p.precio) * Number(p.stock || 0),
    0,
  );
  const agotados = productos.filter((p) => Number(p.stock) <= 0).length;

  const metricas = [
    { etiqueta: 'Productos', valor: productos.length, icono: '📦' },
    { etiqueta: 'Unidades en stock', valor: unidades, icono: '🔢' },
    { etiqueta: 'Servicios', valor: servicios.length, icono: '🔧' },
    { etiqueta: 'Valor inventario', valor: formatearPrecio(valorInventario), icono: '💰' },
  ];

  return (
    <div className="animate-aparecer">
      <section className="relative overflow-hidden px-5 pb-6 pt-12 sm:px-8">
        <div className="halo -left-10 top-0 h-56 w-56 bg-ok-500/10" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl">
          <span className="etiqueta etiqueta-ok mb-3">Panel de empleado</span>
          <h1 className="titulo-seccion text-3xl sm:text-4xl">
            Hola, <span className="texto-degradado">{usuario.nombres}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist-400">
            Gestiona el catálogo de productos y los servicios del taller. La
            administración de usuarios está reservada al rol de administrador.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {/* Métricas */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricas.map((metrica, i) => (
            <div key={metrica.etiqueta} className="metrica animate-subir" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.66rem] uppercase tracking-[0.14em] text-mist-600">
                    {metrica.etiqueta}
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-mist-50">{metrica.valor}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg">
                  {metrica.icono}
                </span>
              </div>
            </div>
          ))}
        </div>

        {agotados > 0 && (
          <Aviso tipo="info">
            Hay {agotados} {agotados === 1 ? 'producto agotado' : 'productos agotados'}. Revisa el
            stock para no perder ventas.
          </Aviso>
        )}

        <Aviso tipo="exito" onCerrar={() => setMensaje('')}>{mensaje}</Aviso>
        <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>

        {/* Pestañas */}
        <div className="mb-5 inline-flex gap-1 rounded-xl border border-line bg-ink-900/70 p-1">
          {PESTANAS.map((opcion) => (
            <button
              key={opcion.clave}
              type="button"
              onClick={() => setPestana(opcion.clave)}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-[0.75rem] font-bold uppercase tracking-wider transition-all ${
                pestana === opcion.clave
                  ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'
                  : 'text-mist-400 hover:bg-white/5 hover:text-mist-50'
              }`}
            >
              <span aria-hidden="true">{opcion.icono}</span>
              {opcion.etiqueta}
              <span className="opacity-70">
                {opcion.clave === 'productos' ? productos.length : servicios.length}
              </span>
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="esqueleto h-96 w-full" />
        ) : (
          <div key={pestana} className="animate-subir">
            <SeccionCatalogo
              tipo={pestana === 'productos' ? 'producto' : 'servicio'}
              items={pestana === 'productos' ? productos : servicios}
              recargar={cargar}
              avisar={avisar}
              alFallar={alFallar}
            />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-mist-600">
          Nota: eliminar productos y servicios está permitido solo al administrador. Si lo
          intentas, el Backend responderá «No tienes permisos».
        </p>
      </section>
    </div>
  );
}
