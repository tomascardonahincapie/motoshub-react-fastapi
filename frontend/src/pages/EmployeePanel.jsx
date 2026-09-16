import { useCallback, useEffect, useMemo, useState } from 'react';
import Aviso from '../components/Aviso';
import Dashboard from '../components/Dashboard';
import TablaVentas from '../components/paneles/TablaVentas';
import TablaFacturas from '../components/paneles/TablaFacturas';
import PanelReportes from '../components/paneles/PanelReportes';
import PanelPqr from '../components/paneles/PanelPqr';
import FormularioVenta from '../components/paneles/FormularioVenta';
import SeccionCatalogo from './admin/SeccionCatalogo';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const PESTANAS = [
  { clave: 'dashboard', etiqueta: 'Dashboard', icono: '📊' },
  { clave: 'ventas', etiqueta: 'Ventas', icono: '🧾' },
  { clave: 'facturas', etiqueta: 'Facturas', icono: '📄' },
  { clave: 'reportes', etiqueta: 'Reportes', icono: '📈' },
  { clave: 'pqr', etiqueta: 'PQR', icono: '💬' },
  { clave: 'productos', etiqueta: 'Productos', icono: '📦' },
  { clave: 'servicios', etiqueta: 'Servicios', icono: '🔧' },
];

/**
 * Panel de empleado.
 *
 * Ve la operación comercial completa —ventas, facturas, reportes y PQR— pero
 * no la administración de cuentas: eso queda reservado al administrador, y no
 * porque el menú lo esconda, sino porque el Backend lo rechaza.
 */
export default function EmployeePanel() {
  const { usuario, token } = useAuth();

  const [pestana, setPestana] = useState('dashboard');
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevaVenta, setNuevaVenta] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const avisar = useCallback((texto) => {
    setError('');
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 4000);
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

      // El empleado necesita la lista de clientes para vender a su nombre.
      // Si el Backend no se la da, simplemente no podrá elegir cliente.
      try {
        const u = await api.getUsuarios(token);
        setClientes((u.usuarios || []).filter(
          (cuenta) => cuenta.nombre_rol === 'Cliente' && cuenta.estado === 'activo',
        ));
      } catch {
        setClientes([]);
      }

      setError('');
    } catch (err) {
      alFallar(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, alFallar]);

  useEffect(() => { cargar(); }, [cargar]);

  const articulos = useMemo(() => [
    ...productos.map((p) => ({ valor: `producto-${p.id_producto}`, etiqueta: p.nombre })),
    ...servicios.map((s) => ({ valor: `servicio-${s.id_servicio}`, etiqueta: `${s.nombre} (servicio)` })),
  ], [productos, servicios]);

  const opcionesClientes = useMemo(
    () => clientes.map((c) => ({ valor: String(c.id_usuario), etiqueta: `${c.nombres} ${c.apellidos}` })),
    [clientes],
  );

  return (
    <div className="animate-aparecer">
      <section className="relative overflow-hidden px-5 pb-6 pt-12 sm:px-8">
        <div className="halo -left-10 top-0 h-56 w-56 bg-ok-500/10" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <div>
            <span className="etiqueta etiqueta-ok mb-3">Panel de empleado</span>
            <h1 className="titulo-seccion text-3xl sm:text-4xl">
              Hola, <span className="texto-degradado">{usuario.nombres}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist-400">
              Registra ventas, emite facturas, genera el reporte diario, atiende las PQR y
              mantén al día el catálogo del taller.
            </p>
          </div>

          <button type="button" onClick={() => setNuevaVenta(true)} className="btn btn-primario w-auto">
            Registrar venta
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <Aviso tipo="exito" onCerrar={() => setMensaje('')}>{mensaje}</Aviso>
        <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>

        {/* Pestañas */}
        <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-line bg-ink-900/70 p-1">
          {PESTANAS.map((opcion) => (
            <button
              key={opcion.clave}
              type="button"
              onClick={() => setPestana(opcion.clave)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[0.72rem] font-bold uppercase tracking-wider transition-all ${
                pestana === opcion.clave
                  ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'
                  : 'text-mist-400 hover:bg-white/5 hover:text-mist-50'
              }`}
            >
              <span aria-hidden="true">{opcion.icono}</span>
              {opcion.etiqueta}
            </button>
          ))}
        </div>

        <div key={pestana} className="animate-subir">
          {pestana === 'dashboard' && (
            <Dashboard token={token} rol="Empleado" articulos={articulos} clientes={opcionesClientes} />
          )}

          {pestana === 'ventas' && (
            <TablaVentas token={token} puedeGestionar articulos={articulos} alRegistrar={cargar} />
          )}

          {pestana === 'facturas' && <TablaFacturas token={token} puedeGestionar />}

          {pestana === 'reportes' && <PanelReportes token={token} />}

          {pestana === 'pqr' && (
            <PanelPqr token={token} puedeGestionar avisar={avisar} alFallar={alFallar} />
          )}

          {(pestana === 'productos' || pestana === 'servicios') && (
            cargando ? <div className="esqueleto h-96 w-full" /> : (
              <SeccionCatalogo
                tipo={pestana === 'productos' ? 'producto' : 'servicio'}
                items={pestana === 'productos' ? productos : servicios}
                recargar={cargar}
                avisar={avisar}
                alFallar={alFallar}
              />
            )
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-mist-600">
          Eliminar productos, servicios o cuentas está reservado al administrador. Si lo
          intentas, el Backend responderá «No tienes permisos».
        </p>
      </section>

      <FormularioVenta
        abierto={nuevaVenta}
        onCerrar={() => setNuevaVenta(false)}
        token={token}
        clientes={clientes}
        productos={productos}
        servicios={servicios}
        alGuardar={(texto) => { avisar(texto); cargar(); }}
      />
    </div>
  );
}
