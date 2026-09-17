import { useCallback, useEffect, useMemo, useState } from 'react';
import MarcoPanel from '../../components/paneles/MarcoPanel';
import { ICONOS } from '../../components/paneles/iconos';
import Dashboard from '../../components/Dashboard';
import TablaVentas from '../../components/paneles/TablaVentas';
import TablaFacturas from '../../components/paneles/TablaFacturas';
import PanelReportes from '../../components/paneles/PanelReportes';
import PanelPqr from '../../components/paneles/PanelPqr';
import FormularioVenta from '../../components/paneles/FormularioVenta';
import SeccionUsuarios from './SeccionUsuarios';
import SeccionCatalogo from './SeccionCatalogo';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const SECCIONES = [
  { clave: 'resumen', etiqueta: 'Dashboard', icono: ICONOS.dashboard,
    descripcion: 'Indicadores y gráficos de toda la operación' },
  { clave: 'ventas', etiqueta: 'Ventas', icono: ICONOS.ventas,
    descripcion: 'Registro e historial de ventas' },
  { clave: 'facturas', etiqueta: 'Facturas', icono: ICONOS.facturas,
    descripcion: 'Consulta y descarga de facturas' },
  { clave: 'reportes', etiqueta: 'Reportes', icono: ICONOS.reportes,
    descripcion: 'Reporte diario en PDF y Excel' },
  { clave: 'pqr', etiqueta: 'PQR', icono: ICONOS.pqr,
    descripcion: 'Peticiones, quejas y reclamos de los clientes' },
  { clave: 'usuarios', etiqueta: 'Usuarios', icono: ICONOS.usuarios,
    descripcion: 'Crea, edita, activa o elimina cuentas' },
  { clave: 'productos', etiqueta: 'Motos', icono: ICONOS.productos,
    descripcion: 'Administra el catálogo de motocicletas' },
  { clave: 'servicios', etiqueta: 'Servicios', icono: ICONOS.servicios,
    descripcion: 'Administra los servicios del taller' },
];

export default function AdminPanel() {
  const { token } = useAuth();

  const [seccion, setSeccion] = useState('resumen');
  const [usuarios, setUsuarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
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

  // Una sola carga alimenta el catálogo, los usuarios y los filtros.
  const cargarTodo = useCallback(async () => {
    setCargando(true);
    try {
      const [u, p, s] = await Promise.all([
        api.getUsuarios(token),
        api.getProductos(),
        api.getServicios(),
      ]);
      setUsuarios(u.usuarios || []);
      setProductos(p.productos || []);
      setServicios(s.servicios || []);
      setError('');
    } catch (err) {
      alFallar(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, alFallar]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const articulos = useMemo(() => [
    ...productos.map((p) => ({ valor: `producto-${p.id_producto}`, etiqueta: p.nombre })),
    ...servicios.map((s) => ({ valor: `servicio-${s.id_servicio}`, etiqueta: `${s.nombre} (servicio)` })),
  ], [productos, servicios]);

  const clientes = useMemo(
    () => usuarios.filter((u) => u.nombre_rol === 'Cliente' && u.estado === 'activo'),
    [usuarios],
  );

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

  const esqueleto = <div className="esqueleto h-96 w-full" />;

  return (
    <MarcoPanel
      secciones={SECCIONES}
      seccion={seccion}
      setSeccion={setSeccion}
      rotulo="Administración"
      mensaje={mensaje}
      error={error}
      onCerrarMensaje={() => setMensaje('')}
      onCerrarError={() => setError('')}
      onRecargar={cargarTodo}
      cargando={cargando}
      acciones={botonVenta}
    >
      {seccion === 'resumen' && (
        <Dashboard
          token={token}
          rol="Administrador"
          articulos={articulos}
          clientes={opcionesClientes}
        />
      )}

      {seccion === 'ventas' && (
        <TablaVentas token={token} puedeGestionar articulos={articulos} alRegistrar={cargarTodo} />
      )}

      {seccion === 'facturas' && <TablaFacturas token={token} puedeGestionar />}

      {seccion === 'reportes' && <PanelReportes token={token} />}

      {seccion === 'pqr' && (
        <PanelPqr token={token} puedeGestionar avisar={avisar} alFallar={alFallar} />
      )}

      {seccion === 'usuarios' && (cargando ? esqueleto : (
        <SeccionUsuarios
          usuarios={usuarios} recargar={cargarTodo} avisar={avisar} alFallar={alFallar}
        />
      ))}

      {seccion === 'productos' && (cargando ? esqueleto : (
        <SeccionCatalogo
          tipo="producto" items={productos} recargar={cargarTodo}
          avisar={avisar} alFallar={alFallar}
        />
      ))}

      {seccion === 'servicios' && (cargando ? esqueleto : (
        <SeccionCatalogo
          tipo="servicio" items={servicios} recargar={cargarTodo}
          avisar={avisar} alFallar={alFallar}
        />
      ))}

      <FormularioVenta
        abierto={nuevaVenta}
        onCerrar={() => setNuevaVenta(false)}
        token={token}
        clientes={clientes}
        productos={productos}
        servicios={servicios}
        alGuardar={(texto) => { avisar(texto); cargarTodo(); }}
      />
    </MarcoPanel>
  );
}
