import { useCallback, useEffect, useMemo, useState } from 'react';
import GraficoBarras from './graficos/GraficoBarras';
import GraficoLineas from './graficos/GraficoLineas';
import BarrasHorizontales from './graficos/BarrasHorizontales';
import TarjetaIndicador from './graficos/TarjetaIndicador';
import Aviso from './Aviso';
import { api } from '../utils/api';
import { usePeticionVigente } from '../utils/peticionVigente';
import { formatearPrecio } from '../config';

const AGRUPACIONES = [
  { valor: 'dia', etiqueta: 'Por día' },
  { valor: 'semana', etiqueta: 'Por semana' },
  { valor: 'mes', etiqueta: 'Por mes' },
];

const ESTADOS = [
  { valor: '', etiqueta: 'Todos los estados' },
  { valor: 'pagada', etiqueta: 'Pagadas' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'anulada', etiqueta: 'Anuladas' },
];

const PAGOS = [
  { valor: '', etiqueta: 'Toda forma de pago' },
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'credito', etiqueta: 'Crédito' },
];

const DIAS_INICIALES = 30;

function haceDias(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().slice(0, 10);
}

const HOY = () => new Date().toISOString().slice(0, 10);

/** Tarjetas de cada rol. Las que el Backend deja en null no se dibujan. */
function tarjetasPara(rol, indicadores) {
  const esCliente = rol === 'Cliente';

  return [
    {
      etiqueta: esCliente ? 'Mis compras' : 'Ventas del periodo',
      valor: indicadores.ventas_cantidad,
      detalle: `Ticket promedio ${formatearPrecio(indicadores.ticket_promedio)}`,
      icono: '🧾', acento: 'brand',
    },
    {
      etiqueta: esCliente ? 'Total invertido' : 'Facturación del periodo',
      valor: formatearPrecio(indicadores.ventas_total),
      detalle: esCliente ? 'Incluye IVA' : 'Sin contar ventas anuladas',
      icono: '💰', acento: 'ok',
    },
    {
      etiqueta: 'Ventas de hoy',
      valor: indicadores.ventas_hoy_total === null || indicadores.ventas_hoy_total === undefined
        ? null
        : formatearPrecio(indicadores.ventas_hoy_total),
      detalle: `${indicadores.ventas_hoy_cantidad ?? 0} operaciones hoy`,
      icono: '📈', acento: 'info',
    },
    {
      etiqueta: 'Acumulado del mes',
      valor: indicadores.ventas_mes_total === null || indicadores.ventas_mes_total === undefined
        ? null
        : formatearPrecio(indicadores.ventas_mes_total),
      detalle: 'Desde el día 1',
      icono: '📅', acento: 'warn',
    },
    {
      etiqueta: esCliente ? 'Mis facturas' : 'Facturas emitidas',
      valor: indicadores.facturas_cantidad,
      detalle: formatearPrecio(indicadores.facturas_total),
      icono: '📄', acento: 'info',
    },
    {
      etiqueta: esCliente ? 'Mis PQR' : 'PQR recibidas',
      valor: indicadores.pqr_total,
      detalle: indicadores.pqr_pendientes > 0
        ? `${indicadores.pqr_pendientes} sin cerrar`
        : 'Todas atendidas',
      icono: '💬',
      acento: indicadores.pqr_pendientes > 0 ? 'peligro' : 'ok',
    },
    {
      etiqueta: 'Catálogo',
      valor: indicadores.productos === null || indicadores.productos === undefined
        ? null
        : `${indicadores.productos} + ${indicadores.servicios}`,
      detalle: 'Productos y servicios publicados',
      icono: '📦', acento: 'brand',
    },
    {
      etiqueta: 'Valor del inventario',
      valor: indicadores.valor_inventario === null || indicadores.valor_inventario === undefined
        ? null
        : formatearPrecio(indicadores.valor_inventario),
      detalle: indicadores.productos_sin_stock > 0
        ? `${indicadores.productos_sin_stock} productos agotados`
        : 'Todo con existencias',
      icono: '🏷️',
      acento: indicadores.productos_sin_stock > 0 ? 'warn' : 'ok',
    },
    {
      etiqueta: 'Usuarios registrados',
      valor: indicadores.usuarios,
      detalle: `${indicadores.usuarios_activos ?? 0} activos · ${indicadores.clientes ?? 0} clientes`,
      icono: '👥', acento: 'info',
    },
  ];
}

function Selector({ etiqueta, valor, onChange, opciones }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">{etiqueta}</span>
      <select
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        className="campo !mb-0 h-9 cursor-pointer !py-0 !text-xs"
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
        ))}
      </select>
    </label>
  );
}

function CampoFecha({ etiqueta, valor, onChange }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">{etiqueta}</span>
      <input
        type="date"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        className="campo !mb-0 h-9 cursor-pointer !py-0 !text-xs"
      />
    </label>
  );
}

/**
 * Dashboard con indicadores y gráficos, compartido por los tres roles.
 *
 * El componente es el mismo para todos: quien decide qué cifras se ven es
 * FastAPI, que recorta la respuesta según el rol del token. Un cliente que
 * abra estas mismas gráficas verá solo sus propias compras.
 */
export default function Dashboard({ token, rol, articulos = [], clientes = [] }) {
  const [filtros, setFiltros] = useState({
    desde: haceDias(DIAS_INICIALES - 1),
    hasta: HOY(),
    agrupar: 'dia',
    estado: '',
    metodo_pago: '',
    articulo: '',
    cliente_id: '',
  });

  const vigente = usePeticionVigente();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cambiar = (campo) => (valor) => setFiltros((previos) => ({ ...previos, [campo]: valor }));

  const consulta = useMemo(() => {
    // El selector de artículo mezcla productos y servicios: "producto-3".
    const [tipo, id] = filtros.articulo ? filtros.articulo.split('-') : [];

    return {
      desde: filtros.desde,
      hasta: filtros.hasta,
      agrupar: filtros.agrupar,
      estado: filtros.estado,
      metodo_pago: filtros.metodo_pago,
      cliente_id: filtros.cliente_id,
      producto_id: tipo === 'producto' ? id : '',
      servicio_id: tipo === 'servicio' ? id : '',
    };
  }, [filtros]);

  const cargar = useCallback(async () => {
    const esVigente = vigente();
    setCargando(true);
    try {
      const datos = await api.getDashboardVentas(consulta, token);
      if (!esVigente()) return;
      setDatos(datos);
      setError('');
    } catch (err) {
      if (esVigente()) setError(err.message);
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [consulta, token, vigente]);

  useEffect(() => { cargar(); }, [cargar]);

  const esCliente = rol === 'Cliente';
  const indicadores = datos?.indicadores ?? {};
  const tarjetas = tarjetasPara(rol, indicadores).filter(
    (t) => t.valor !== null && t.valor !== undefined,
  );

  return (
    <div className="space-y-5">
      <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>

      {/* --- Filtros (requerimiento 13) ------------------------------------ */}
      <section className="tarjeta p-4">
        <div className="flex flex-wrap items-end gap-3">
          <CampoFecha etiqueta="Desde" valor={filtros.desde} onChange={cambiar('desde')} />
          <CampoFecha etiqueta="Hasta" valor={filtros.hasta} onChange={cambiar('hasta')} />
          <Selector
            etiqueta="Agrupar"
            valor={filtros.agrupar}
            onChange={cambiar('agrupar')}
            opciones={AGRUPACIONES.map((a) => ({ valor: a.valor, etiqueta: a.etiqueta }))}
          />
          <Selector etiqueta="Estado" valor={filtros.estado} onChange={cambiar('estado')} opciones={ESTADOS} />
          <Selector etiqueta="Pago" valor={filtros.metodo_pago} onChange={cambiar('metodo_pago')} opciones={PAGOS} />

          {articulos.length > 0 && (
            <Selector
              etiqueta="Artículo"
              valor={filtros.articulo}
              onChange={cambiar('articulo')}
              opciones={[{ valor: '', etiqueta: 'Todo el catálogo' }, ...articulos]}
            />
          )}

          {!esCliente && clientes.length > 0 && (
            <Selector
              etiqueta="Cliente"
              valor={filtros.cliente_id}
              onChange={cambiar('cliente_id')}
              opciones={[{ valor: '', etiqueta: 'Todos los clientes' }, ...clientes]}
            />
          )}

          <button
            type="button"
            onClick={cargar}
            disabled={cargando}
            className="btn btn-fantasma ml-auto h-9 w-auto !py-0 !text-[0.68rem]"
          >
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </section>

      {/* --- Tarjetas de indicadores (requerimientos 10 y 11) -------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cargando && !datos
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="esqueleto h-[6.5rem] w-full" />)
          : tarjetas.map((tarjeta) => <TarjetaIndicador key={tarjeta.etiqueta} {...tarjeta} />)}
      </div>

      {/* --- Gráficos (requerimiento 11) ----------------------------------- */}
      {cargando && !datos ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="esqueleto h-80 w-full" />
          <div className="esqueleto h-80 w-full" />
        </div>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <GraficoBarras
              datos={datos?.serie ?? []}
              titulo={esCliente ? 'Mis compras por periodo' : 'Ventas por periodo'}
              descripcion={`Gráfico de barras · ${AGRUPACIONES.find((a) => a.valor === filtros.agrupar)?.etiqueta.toLowerCase()}`}
              formato={formatearPrecio}
              etiquetaValor="Facturado"
            />
            <GraficoLineas
              datos={datos?.serie ?? []}
              titulo="Tendencia"
              descripcion="Gráfico lineal sobre la misma serie"
              formato={formatearPrecio}
              etiquetaValor="Facturado"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <BarrasHorizontales
              datos={datos?.ranking ?? []}
              titulo={esCliente ? 'Lo que más he comprado' : 'Lo más vendido'}
              descripcion="Ordenado por unidades"
              campoEtiqueta="nombre"
              campoValor="cantidad"
              formatoValor={(v) => `${v} und`}
              detalle={(fila) => `· ${formatearPrecio(fila.total)}`}
            />
            <BarrasHorizontales
              datos={datos?.por_estado ?? []}
              titulo="Por estado"
              descripcion="Cómo se reparten las operaciones"
              formatoValor={(v) => `${v}`}
            />
            <BarrasHorizontales
              datos={datos?.por_metodo_pago ?? []}
              titulo="Por forma de pago"
              descripcion="Cómo paga la gente"
              formatoValor={(v) => `${v}`}
              detalle={(fila) => `· ${formatearPrecio(fila.total)}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
