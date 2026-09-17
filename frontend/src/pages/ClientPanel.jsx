import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarcoPanel from '../components/paneles/MarcoPanel';
import { ICONOS } from '../components/paneles/iconos';
import Dashboard from '../components/Dashboard';
import TablaVentas from '../components/paneles/TablaVentas';
import TablaFacturas from '../components/paneles/TablaFacturas';
import PanelPqr from '../components/paneles/PanelPqr';
import IconoWhatsApp from '../components/IconoWhatsApp';
import { useAuth } from '../context/AuthContext';
import { NEGOCIO, enlaceWhatsApp } from '../config';

const SECCIONES = [
  { clave: 'resumen', etiqueta: 'Resumen', icono: ICONOS.dashboard,
    descripcion: 'Tus indicadores y el histórico de tus compras' },
  { clave: 'compras', etiqueta: 'Mis compras', icono: ICONOS.ventas,
    descripcion: 'Todo lo que has comprado, con su detalle' },
  { clave: 'facturas', etiqueta: 'Mis facturas', icono: ICONOS.facturas,
    descripcion: 'Descarga tus facturas en PDF' },
  { clave: 'pqr', etiqueta: 'PQR', icono: ICONOS.pqr,
    descripcion: 'Radica una solicitud y consulta su estado' },
  { clave: 'cuenta', etiqueta: 'Mi cuenta', icono: ICONOS.cuenta,
    descripcion: 'Los datos que aparecen en tus facturas' },
];

/**
 * Panel del cliente.
 *
 * Usa el mismo marco, los mismos componentes y los mismos endpoints que el
 * panel del administrador. La diferencia la pone FastAPI: con un token de
 * cliente, las consultas solo devuelven sus propias compras, facturas y PQR.
 */
export default function ClientPanel() {
  const { usuario, token } = useAuth();

  const [seccion, setSeccion] = useState('resumen');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const avisar = (texto) => {
    setError('');
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 5000);
  };

  const datosCuenta = [
    { etiqueta: 'Nombre completo', valor: `${usuario.nombres} ${usuario.apellidos}` },
    { etiqueta: 'Correo', valor: usuario.email },
    { etiqueta: 'Documento', valor: `${usuario.tipo_documento} ${usuario.numero_documento}` },
    { etiqueta: 'Teléfono', valor: usuario.telefono || '—' },
    { etiqueta: 'Dirección', valor: usuario.direccion || '—' },
    { etiqueta: 'Rol', valor: usuario.nombre_rol },
  ];

  const seguirComprando = (
    <Link to="/catalogo" className="btn btn-primario hidden h-9 w-auto !py-0 !text-[0.68rem] sm:inline-flex">
      Seguir comprando
    </Link>
  );

  return (
    <MarcoPanel
      secciones={SECCIONES}
      seccion={seccion}
      setSeccion={setSeccion}
      rotulo="Mi cuenta"
      mensaje={mensaje}
      error={error}
      onCerrarMensaje={() => setMensaje('')}
      onCerrarError={() => setError('')}
      acciones={seguirComprando}
    >
      {seccion === 'resumen' && <Dashboard token={token} rol="Cliente" />}

      {seccion === 'compras' && (
        <TablaVentas
          token={token}
          titulo="Mis compras"
          descripcion="Todo lo que has comprado, con su detalle y su factura"
        />
      )}

      {seccion === 'facturas' && <TablaFacturas token={token} titulo="Mis facturas" />}

      {seccion === 'pqr' && <PanelPqr token={token} avisar={avisar} alFallar={setError} />}

      {seccion === 'cuenta' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="tarjeta p-5 lg:col-span-2">
            <h3 className="font-display text-base font-semibold text-mist-50">Mis datos</h3>
            <p className="mt-0.5 text-xs text-mist-500">Son los que aparecen en tus facturas</p>

            <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {datosCuenta.map((dato) => (
                <div key={dato.etiqueta}>
                  <dt className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">
                    {dato.etiqueta}
                  </dt>
                  <dd className="mt-1 break-words text-sm text-mist-100">{dato.valor}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-xs leading-relaxed text-mist-600">
              Para cambiar estos datos escríbenos: el administrador los actualiza desde su
              panel. Las facturas ya emitidas conservan los datos que tenías al comprarlas.
            </p>
          </section>

          <section className="tarjeta flex flex-col p-5">
            <h3 className="font-display text-base font-semibold text-mist-50">¿Necesitas ayuda?</h3>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-mist-500">
              Puedes preguntarle al asistente virtual del sitio, radicar una PQR desde la
              sección correspondiente o escribirnos directamente por WhatsApp.
            </p>

            <a
              href={enlaceWhatsApp(
                `Hola ${NEGOCIO.nombre}, soy ${usuario.nombres} ${usuario.apellidos} y necesito ayuda con mi cuenta.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp mt-4 w-full"
            >
              <IconoWhatsApp className="h-4 w-4" />
              Escribir por WhatsApp
            </a>
            <button type="button" onClick={() => setSeccion('pqr')} className="btn btn-fantasma mt-2 w-full">
              Radicar una PQR
            </button>
          </section>
        </div>
      )}
    </MarcoPanel>
  );
}
