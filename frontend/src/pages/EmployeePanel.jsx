import { useCallback, useEffect, useMemo, useState } from 'react';
import MarcoPanel from '../components/paneles/MarcoPanel';
import { ICONOS } from '../components/paneles/iconos';
import Dashboard from '../components/Dashboard';
import TablaVentas from '../components/paneles/TablaVentas';
import TablaFacturas from '../components/paneles/TablaFacturas';
import PanelReportes from '../components/paneles/PanelReportes';
import PanelPqr from '../components/paneles/PanelPqr';
import FormularioVenta from '../components/paneles/FormularioVenta';
import SeccionCatalogo from './admin/SeccionCatalogo';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

// Las mismas secciones del administrador menos la gestión de cuentas, que
// está reservada a ese rol. No es que el menú la esconda: el Backend la
// rechaza igualmente si se intenta por la API.
const SECCIONES = [
  { clave: 'resumen', etiqueta: 'Dashboard', icono: ICONOS.dashboard,
    descripcion: 'Indicadores y gráficos de la operación comercial' },
  { clave: 'ventas', etiqueta: 'Ventas', icono: ICONOS.ventas,
    descripcion: 'Registro e historial de ventas' },
  { clave: 'facturas', etiqueta: 'Facturas', icono: ICONOS.facturas,
    descripcion: 'Consulta y descarga de facturas' },
  { clave: 'reportes', etiqueta: 'Reportes', icono: ICONOS.reportes,
    descripcion: 'Reporte diario en PDF y Excel' },
  { clave: 'pqr', etiqueta: 'PQR', icono: ICONOS.pqr,
    descripcion: 'Peticiones, quejas y reclamos de los clientes' },
  { clave: 'productos', etiqueta: 'Motos', icono: ICONOS.productos,
    descripcion: 'Administra el catálogo de motocicletas' },
  { clave: 'servicios', etiqueta: 'Servicios', icono: ICONOS.servicios,
    descripcion: 'Administra los servicios del taller' },
];

export default function EmployeePanel() {
  const { token } = useAuth();

  const [seccion, setSeccion] = useState('resumen');
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

  const botonVenta = ['resumen', 'ventas', 'facturas'].includes(seccion) ? (
    <button
      type="button"
      onClick={() => setNuevaVenta(true)}
      className="btn btn-primario hidden h-9 w-auto !py-0 !text-[0.68rem] sm:inline-flex"
    >
      Registrar venta
    </button>
  ) : null;

  return (
    <MarcoPanel
      secciones={SECCIONES}
      seccion={seccion}
      setSeccion={setSeccion}
      rotulo="Empleado"
      mensaje={mensaje}
      error={error}
      onCerrarMensaje={() => setMensaje('')}
      onCerrarError={() => setError('')}
      onRecargar={cargar}
      cargando={cargando}
      acciones={botonVenta}
    >
      {seccion === 'resumen' && (
        <Dashboard token={token} rol="Empleado" articulos={articulos} clientes={opcionesClientes} />
      )}

      {seccion === 'ventas' && (
        <TablaVentas token={token} puedeGestionar articulos={articulos} alRegistrar={cargar} />
      )}

      {seccion === 'facturas' && <TablaFacturas token={token} puedeGestionar />}

      {seccion === 'reportes' && <PanelReportes token={token} />}

      {seccion === 'pqr' && (
        <PanelPqr token={token} puedeGestionar avisar={avisar} alFallar={alFallar} />
      )}

      {(seccion === 'productos' || seccion === 'servicios') && (
        cargando ? <div className="esqueleto h-96 w-full" /> : (
          <SeccionCatalogo
            tipo={seccion === 'productos' ? 'producto' : 'servicio'}
            items={seccion === 'productos' ? productos : servicios}
            recargar={cargar}
            avisar={avisar}
            alFallar={alFallar}
          />
        )
      )}

      <FormularioVenta
        abierto={nuevaVenta}
        onCerrar={() => setNuevaVenta(false)}
        token={token}
        clientes={clientes}
        productos={productos}
        servicios={servicios}
        alGuardar={(texto) => { avisar(texto); cargar(); }}
      />
    </MarcoPanel>
  );
}
