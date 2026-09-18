import { useCallback, useEffect, useState } from 'react';
import Modal from '../Modal';
import Aviso from '../Aviso';
import { EtiquetaPqr, textoTipoPqr } from './Etiquetas';
import { api } from '../../utils/api';
import { usePeticionVigente } from '../../utils/peticionVigente';
import { formatearFecha } from '../../config';

const TIPOS = [
  { valor: 'peticion', etiqueta: 'Petición' },
  { valor: 'queja', etiqueta: 'Queja' },
  { valor: 'reclamo', etiqueta: 'Reclamo' },
  { valor: 'sugerencia', etiqueta: 'Sugerencia' },
];

const ESTADOS = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'en_proceso', etiqueta: 'En proceso' },
  { valor: 'respondida', etiqueta: 'Respondida' },
  { valor: 'cerrada', etiqueta: 'Cerrada' },
];

const FILTROS = [
  { valor: '', etiqueta: 'Todas' },
  ...ESTADOS.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta })),
];

function Contadores({ resumen, filtro, setFiltro }) {
  const tarjetas = [
    ['', 'Total', resumen.total, 'text-mist-50'],
    ['pendiente', 'Pendientes', resumen.pendientes, 'text-danger-400'],
    ['en_proceso', 'En proceso', resumen.en_proceso, 'text-warn-400'],
    ['respondida', 'Respondidas', resumen.respondidas, 'text-ok-400'],
    ['cerrada', 'Cerradas', resumen.cerradas, 'text-mist-400'],
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {tarjetas.map(([valor, etiqueta, cantidad, color]) => (
        <button
          key={etiqueta}
          type="button"
          onClick={() => setFiltro(valor)}
          className={`metrica text-left transition-colors ${
            filtro === valor ? '!border-brand-500/45' : ''
          }`}
        >
          <p className="text-[0.6rem] uppercase tracking-[0.14em] text-mist-600">{etiqueta}</p>
          <p className={`mt-1 font-display text-2xl font-bold ${color}`}>{cantidad}</p>
        </button>
      ))}
    </div>
  );
}

function FormularioRadicar({ abierto, onCerrar, token, alGuardar }) {
  const vigente = usePeticionVigente();
  const [datos, setDatos] = useState({ tipo: 'peticion', asunto: '', descripcion: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (campo) => (evento) =>
    setDatos((previos) => ({ ...previos, [campo]: evento.target.value }));

  const enviar = async (evento) => {
    evento.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const respuesta = await api.crearPqr(datos, token);
      setDatos({ tipo: 'peticion', asunto: '', descripcion: '' });
      onCerrar();
      alGuardar(`Tu solicitud quedó radicada con el número ${respuesta.radicado}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Radicar una PQR"
      descripcion="Recibirás un número de radicado para hacerle seguimiento"
    >
      <form onSubmit={enviar}>
        <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
            Tipo de solicitud
          </span>
          <select value={datos.tipo} onChange={cambiar('tipo')} className="campo cursor-pointer">
            {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
          </select>
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
            Asunto
          </span>
          <input
            type="text" value={datos.asunto} onChange={cambiar('asunto')}
            maxLength={120} minLength={5} required
            placeholder="Resume en una línea lo que ocurrió"
            className="campo"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
            Descripción
          </span>
          <textarea
            value={datos.descripcion} onChange={cambiar('descripcion')}
            maxLength={2000} minLength={15} required rows={5}
            placeholder="Cuéntanos con detalle qué pasó. Si tienes el número de la venta o de la factura, inclúyelo."
            className="campo resize-y"
          />
          <span className="mt-1 block text-right text-[0.7rem] tabular-nums text-mist-600">
            {datos.descripcion.length}/2000
          </span>
        </label>

        <button type="submit" disabled={enviando} className="btn btn-primario w-full">
          {enviando ? 'Radicando...' : 'Radicar solicitud'}
        </button>
      </form>
    </Modal>
  );
}

function DetallePqr({ registro, token, puedeGestionar, alGuardar, alFallar, onCerrar }) {
  const [estado, setEstado] = useState(registro?.estado ?? 'pendiente');
  const [respuesta, setRespuesta] = useState(registro?.respuesta ?? '');
  const [enviando, setEnviando] = useState(false);

  if (!registro) return null;

  const responder = async () => {
    setEnviando(true);
    try {
      await api.responderPqr(registro.id_pqr, { estado, respuesta: respuesta || null }, token);
      onCerrar();
      alGuardar(`La PQR ${registro.radicado} quedó como "${estado.replace('_', ' ')}"`);
    } catch (err) {
      alFallar(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="etiqueta etiqueta-marca">{textoTipoPqr(registro.tipo)}</span>
        <EtiquetaPqr estado={registro.estado} />
        <span className="text-xs text-mist-600">{formatearFecha(registro.fecha_registro)}</span>
      </div>

      <div>
        <p className="font-display text-lg font-semibold text-mist-50">{registro.asunto}</p>
        <p className="mt-1 text-xs text-mist-600">
          Radicada por {registro.cliente_nombre} · {registro.cliente_email}
        </p>
      </div>

      <div className="superficie whitespace-pre-line p-4 text-sm leading-relaxed text-mist-300">
        {registro.descripcion}
      </div>

      {registro.respuesta && (
        <div className="rounded-xl border border-ok-500/25 bg-ok-500/8 p-4">
          <p className="text-[0.62rem] uppercase tracking-[0.14em] text-ok-400">
            Respuesta de {registro.agente_nombre || 'MotosHub'}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-mist-200">
            {registro.respuesta}
          </p>
          <p className="mt-2 text-[0.68rem] text-mist-600">
            {formatearFecha(registro.fecha_respuesta)}
          </p>
        </div>
      )}

      {puedeGestionar && (
        <div className="space-y-3 border-t border-line pt-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
              Estado
            </span>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="campo cursor-pointer">
              {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
              Respuesta al cliente
            </span>
            <textarea
              value={respuesta} onChange={(e) => setRespuesta(e.target.value)}
              maxLength={2000} rows={4}
              placeholder="Escribe la respuesta que verá el cliente en su panel."
              className="campo resize-y"
            />
          </label>

          <button type="button" onClick={responder} disabled={enviando} className="btn btn-primario w-full">
            {enviando ? 'Guardando...' : 'Guardar respuesta'}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Módulo de PQR (requerimiento 16).
 *
 * El cliente radica y consulta el estado de sus solicitudes; el administrador
 * y el empleado ven las de todos y responden. Quien ve qué lo decide FastAPI.
 */
export default function PanelPqr({ token, puedeGestionar = false, avisar, alFallar }) {
  const [registros, setRegistros] = useState([]);
  const [resumen, setResumen] = useState({
    total: 0, pendientes: 0, en_proceso: 0, respondidas: 0, cerradas: 0,
  });
  const [filtro, setFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState(null);
  const [radicando, setRadicando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const esVigente = vigente();
    setCargando(true);
    try {
      const datos = await api.getPqr({ estado: filtro, busqueda }, token);
      if (!esVigente()) return;
      setRegistros(datos.pqr);
      setResumen(datos.resumen);
      setError('');
    } catch (err) {
      if (esVigente()) setError(err.message);
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [filtro, busqueda, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const confirmar = (mensaje) => {
    (avisar ?? (() => {}))(mensaje);
    cargar();
  };

  const fallar = (mensaje) => {
    setError(mensaje);
    (alFallar ?? (() => {}))(mensaje);
  };

  return (
    <div className="space-y-4">
      <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>

      <Contadores resumen={resumen} filtro={filtro} setFiltro={setFiltro} />

      <section className="tarjeta overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-semibold text-mist-50">
              {puedeGestionar ? 'Peticiones, quejas y reclamos' : 'Mis solicitudes'}
            </h3>
            <p className="mt-0.5 text-xs text-mist-500">
              {puedeGestionar
                ? 'Responde y cambia el estado de cada radicado'
                : 'Consulta el estado de lo que has radicado'}
            </p>
          </div>

          <input
            type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Radicado o asunto..."
            className="campo !mb-0 h-9 w-full max-w-[14rem] !py-0 !text-xs"
          />

          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}
                  className="campo !mb-0 h-9 w-auto cursor-pointer !py-0 !text-xs">
            {FILTROS.map((f) => <option key={f.valor} value={f.valor}>{f.etiqueta}</option>)}
          </select>

          {!puedeGestionar && (
            <button type="button" onClick={() => setRadicando(true)}
                    className="btn btn-primario h-9 w-auto !py-0 !text-[0.68rem]">
              Radicar PQR
            </button>
          )}
        </header>

        {cargando ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="esqueleto h-16 w-full" />)}
          </div>
        ) : registros.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm text-mist-600">
              {puedeGestionar ? 'No hay solicitudes con este filtro.' : 'Todavía no has radicado ninguna PQR.'}
            </p>
            {!puedeGestionar && (
              <button type="button" onClick={() => setRadicando(true)}
                      className="btn btn-fantasma mx-auto mt-4 w-auto">
                Radicar la primera
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {registros.map((registro) => (
              <li key={registro.id_pqr}>
                <button
                  type="button"
                  onClick={() => setSeleccionada(registro)}
                  className="fila-tabla flex w-full items-start gap-3 px-5 py-3.5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tabular-nums text-mist-100">{registro.radicado}</span>
                      <span className="etiqueta etiqueta-neutra">{textoTipoPqr(registro.tipo)}</span>
                      <EtiquetaPqr estado={registro.estado} />
                    </div>
                    <p className="mt-1 truncate text-sm text-mist-300">{registro.asunto}</p>
                    <p className="mt-0.5 text-[0.68rem] text-mist-600">
                      {puedeGestionar && `${registro.cliente_nombre} · `}
                      {formatearFecha(registro.fecha_registro)}
                      {registro.respuesta && ' · respondida'}
                    </p>
                  </div>
                  <span className="shrink-0 self-center text-mist-600" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        abierto={!!seleccionada}
        onCerrar={() => setSeleccionada(null)}
        titulo={seleccionada ? seleccionada.radicado : ''}
        descripcion={seleccionada ? textoTipoPqr(seleccionada.tipo) : ''}
      >
        <DetallePqr
          registro={seleccionada}
          token={token}
          puedeGestionar={puedeGestionar}
          alGuardar={confirmar}
          alFallar={fallar}
          onCerrar={() => setSeleccionada(null)}
        />
      </Modal>

      <FormularioRadicar
        abierto={radicando}
        onCerrar={() => setRadicando(false)}
        token={token}
        alGuardar={confirmar}
      />
    </div>
  );
}
