import { useState } from 'react';
import { Link } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import TablaVentas from '../components/paneles/TablaVentas';
import TablaFacturas from '../components/paneles/TablaFacturas';
import PanelPqr from '../components/paneles/PanelPqr';
import Aviso from '../components/Aviso';
import IconoWhatsApp from '../components/IconoWhatsApp';
import { useAuth } from '../context/AuthContext';
import { NEGOCIO, enlaceWhatsApp } from '../config';

const PESTANAS = [
  { clave: 'resumen', etiqueta: 'Resumen', icono: '📊' },
  { clave: 'compras', etiqueta: 'Mis compras', icono: '🧾' },
  { clave: 'facturas', etiqueta: 'Mis facturas', icono: '📄' },
  { clave: 'pqr', etiqueta: 'PQR', icono: '💬' },
  { clave: 'cuenta', etiqueta: 'Mi cuenta', icono: '👤' },
];

/**
 * Panel del cliente.
 *
 * Usa exactamente los mismos componentes y los mismos endpoints que el panel
 * del administrador. La diferencia la pone FastAPI: con un token de cliente,
 * las consultas solo devuelven sus propias compras, facturas y PQR.
 */
export default function ClientPanel() {
  const { usuario, token } = useAuth();

  const [pestana, setPestana] = useState('resumen');
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

  return (
    <div className="animate-aparecer">
      {/* Saludo */}
      <section className="relative overflow-hidden px-5 pb-6 pt-12 sm:px-8">
        <div className="halo -left-10 top-0 h-56 w-56 bg-brand-500/12" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <div>
            <span className="etiqueta etiqueta-neutra mb-3">Mi cuenta</span>
            <h1 className="titulo-seccion text-3xl sm:text-4xl">
              Hola, <span className="texto-degradado">{usuario.nombres}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist-400">
              Aquí tienes tus compras, tus facturas para descargar y el estado de las
              solicitudes que nos hayas radicado.
            </p>
          </div>

          <Link to="/catalogo" className="btn btn-primario w-auto">
            Seguir comprando
          </Link>
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
          {pestana === 'resumen' && <Dashboard token={token} rol="Cliente" />}

          {pestana === 'compras' && (
            <TablaVentas
              token={token}
              titulo="Mis compras"
              descripcion="Todo lo que has comprado, con su detalle y su factura"
            />
          )}

          {pestana === 'facturas' && (
            <TablaFacturas token={token} titulo="Mis facturas" />
          )}

          {pestana === 'pqr' && (
            <PanelPqr token={token} avisar={avisar} alFallar={setError} />
          )}

          {pestana === 'cuenta' && (
            <div className="grid gap-5 lg:grid-cols-3">
              <section className="tarjeta p-5 lg:col-span-2">
                <h3 className="font-display text-base font-semibold text-mist-50">Mis datos</h3>
                <p className="mt-0.5 text-xs text-mist-500">
                  Son los que aparecen en tus facturas
                </p>

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
                <h3 className="font-display text-base font-semibold text-mist-50">
                  ¿Necesitas ayuda?
                </h3>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-mist-500">
                  Puedes preguntarle al asistente virtual del sitio, radicar una PQR desde la
                  pestaña correspondiente o escribirnos directamente por WhatsApp.
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
                <button
                  type="button"
                  onClick={() => setPestana('pqr')}
                  className="btn btn-fantasma mt-2 w-full"
                >
                  Radicar una PQR
                </button>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
