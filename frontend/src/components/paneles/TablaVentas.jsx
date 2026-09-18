import { useCallback, useEffect, useState } from 'react';
import Modal from '../Modal';
import Aviso from '../Aviso';
import { EtiquetaVenta, textoMetodoPago } from './Etiquetas';
import { api } from '../../utils/api';
import { usePeticionVigente } from '../../utils/peticionVigente';
import { formatearFecha, formatearPrecio } from '../../config';

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

const FILTROS_VACIOS = {
  desde: '', hasta: '', estado: '', metodo_pago: '', busqueda: '', articulo: '',
};

function Resumen({ resumen }) {
  const datos = [
    ['Operaciones', resumen.cantidad],
    ['Subtotal', formatearPrecio(resumen.subtotal)],
    ['IVA', formatearPrecio(resumen.impuestos)],
    ['Total', formatearPrecio(resumen.total)],
    ['Ticket promedio', formatearPrecio(resumen.ticket_promedio)],
  ];

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line px-5 py-3.5">
      {datos.map(([etiqueta, valor], i) => (
        <div key={etiqueta}>
          <p className="text-[0.6rem] uppercase tracking-[0.14em] text-mist-600">{etiqueta}</p>
          <p className={`text-sm font-bold tabular-nums ${i === 3 ? 'text-brand-400' : 'text-mist-100'}`}>
            {valor}
          </p>
        </div>
      ))}
    </div>
  );
}

function DetalleVenta({ venta, token, alFallar }) {
  if (!venta) return null;

  const descargar = async () => {
    try {
      await api.descargarFactura(venta.id_factura, venta.numero_factura, token);
    } catch (error) {
      alFallar(error.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="superficie p-4">
          <p className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">Cliente</p>
          <p className="mt-1 text-sm font-semibold text-mist-50">{venta.cliente_nombre}</p>
          <p className="mt-2 text-xs text-mist-500">
            Atendido por: {venta.vendedor_nombre || 'Compra en línea'}
          </p>
        </div>
        <div className="superficie p-4">
          <p className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">Operación</p>
          <p className="mt-1 text-sm font-semibold text-mist-50">{formatearFecha(venta.fecha_venta)}</p>
          <p className="mt-2 text-xs text-mist-500">
            {textoMetodoPago(venta.metodo_pago)}
            {venta.numero_factura && ` · Factura ${venta.numero_factura}`}
          </p>
        </div>
      </div>

      <div className="tarjeta overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line bg-ink-850 text-[0.62rem] uppercase tracking-wider text-mist-600">
            <tr>
              <th className="px-4 py-2.5">Artículo</th>
              <th className="px-4 py-2.5 text-center">Cant.</th>
              <th className="px-4 py-2.5 text-right">Precio</th>
              <th className="px-4 py-2.5 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {venta.detalles.map((detalle) => (
              <tr key={detalle.id_detalle}>
                <td className="px-4 py-2.5">
                  <p className="text-mist-100">{detalle.nombre_item}</p>
                  <p className="text-[0.66rem] text-mist-600">{detalle.tipo_item}</p>
                </td>
                <td className="px-4 py-2.5 text-center tabular-nums text-mist-300">{detalle.cantidad}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-mist-400">
                  {formatearPrecio(detalle.precio_unitario)}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-mist-100">
                  {formatearPrecio(detalle.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="space-y-1 border-t border-line px-4 py-3 text-xs">
          {[
            ['Subtotal', venta.subtotal],
            ['Descuentos', venta.descuento],
            ['IVA', venta.impuestos],
          ].map(([etiqueta, valor]) => (
            <div key={etiqueta} className="flex justify-between text-mist-500">
              <dt>{etiqueta}</dt>
              <dd className="tabular-nums">{formatearPrecio(valor)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-2 text-sm font-bold text-mist-50">
            <dt>Total</dt>
            <dd className="tabular-nums text-brand-400">{formatearPrecio(venta.total)}</dd>
          </div>
        </dl>
      </div>

      {venta.observaciones && (
        <p className="text-xs leading-relaxed text-mist-500">
          <strong className="text-mist-300">Observaciones:</strong> {venta.observaciones}
        </p>
      )}

      {venta.id_factura && (
        <button type="button" onClick={descargar} className="btn btn-primario w-full">
          Descargar factura {venta.numero_factura} en PDF
        </button>
      )}
    </div>
  );
}

/**
 * Historial de ventas con sus filtros (requerimiento 3).
 *
 * El mismo componente sirve para el administrador, el empleado y el cliente:
 * FastAPI recorta el resultado según el rol del token, así que un cliente ve
 * aquí sus propias compras sin que el Frontend tenga que hacer nada distinto.
 */
export default function TablaVentas({
  token,
  puedeGestionar = false,
  articulos = [],
  titulo = 'Historial de ventas',
  descripcion = 'Filtra por fecha, estado, forma de pago o artículo',
  alRegistrar,
}) {
  const vigente = usePeticionVigente();
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [ventas, setVentas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState(null);

  const cargar = useCallback(async () => {
    const esVigente = vigente();
    setCargando(true);
    try {
      const [tipo, id] = filtros.articulo ? filtros.articulo.split('-') : [];
      const datos = await api.getVentas(
        {
          desde: filtros.desde,
          hasta: filtros.hasta,
          estado: filtros.estado,
          metodo_pago: filtros.metodo_pago,
          busqueda: filtros.busqueda,
          producto_id: tipo === 'producto' ? id : '',
          servicio_id: tipo === 'servicio' ? id : '',
        },
        token,
      );
      if (!esVigente()) return;
      setVentas(datos.ventas);
      setResumen(datos.resumen);
      setError('');
    } catch (err) {
      if (esVigente()) setError(err.message);
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [filtros, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const anular = async (venta) => {
    try {
      await api.cambiarEstadoVenta(venta.id_venta, 'anulada', token);
      setDetalle(null);
      cargar();
      alRegistrar?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const cambiar = (campo) => (evento) =>
    setFiltros((previos) => ({ ...previos, [campo]: evento.target.value }));

  return (
    <div className="space-y-4">
      <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>

      {/* --- Filtros ------------------------------------------------------- */}
      <section className="tarjeta p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">Desde</span>
            <input type="date" value={filtros.desde} onChange={cambiar('desde')}
                   className="campo !mb-0 h-9 cursor-pointer !py-0 !text-xs" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">Hasta</span>
            <input type="date" value={filtros.hasta} onChange={cambiar('hasta')}
                   className="campo !mb-0 h-9 cursor-pointer !py-0 !text-xs" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">Estado</span>
            <select value={filtros.estado} onChange={cambiar('estado')}
                    className="campo !mb-0 h-9 cursor-pointer !py-0 !text-xs">
              {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">Pago</span>
            <select value={filtros.metodo_pago} onChange={cambiar('metodo_pago')}
                    className="campo !mb-0 h-9 cursor-pointer !py-0 !text-xs">
              {PAGOS.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
            </select>
          </label>

          {articulos.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">Artículo</span>
              <select value={filtros.articulo} onChange={cambiar('articulo')}
                      className="campo !mb-0 h-9 max-w-[12rem] cursor-pointer !py-0 !text-xs">
                <option value="">Todo el catálogo</option>
                {articulos.map((a) => <option key={a.valor} value={a.valor}>{a.etiqueta}</option>)}
              </select>
            </label>
          )}

          <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
            <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">Buscar</span>
            <input
              type="search" value={filtros.busqueda} onChange={cambiar('busqueda')}
              placeholder="N.º de venta, cliente, documento..."
              className="campo !mb-0 h-9 !py-0 !text-xs"
            />
          </label>

          <button type="button" onClick={() => setFiltros(FILTROS_VACIOS)}
                  className="btn btn-fantasma h-9 w-auto !py-0 !text-[0.68rem]">
            Limpiar
          </button>
        </div>
      </section>

      {/* --- Tabla --------------------------------------------------------- */}
      <section className="tarjeta overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-mist-50">{titulo}</h3>
            <p className="mt-0.5 text-xs text-mist-500">{descripcion}</p>
          </div>
          <span className="etiqueta etiqueta-neutra shrink-0">{ventas.length} resultados</span>
        </header>

        {cargando ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="esqueleto h-12 w-full" />)}
          </div>
        ) : ventas.length === 0 ? (
          <p className="py-14 text-center text-sm text-mist-600">
            No hay ventas que coincidan con estos filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-line bg-ink-850 text-[0.62rem] uppercase tracking-wider text-mist-600">
                <tr>
                  <th className="px-5 py-3">Venta</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Artículos</th>
                  <th className="px-5 py-3">Pago</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {ventas.map((venta) => (
                  <tr key={venta.id_venta} className="fila-tabla">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-mist-100">{venta.numero_venta}</p>
                      {venta.numero_factura && (
                        <p className="text-[0.66rem] text-mist-600">{venta.numero_factura}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-mist-400">
                      {formatearFecha(venta.fecha_venta)}
                    </td>
                    <td className="px-5 py-3 text-xs text-mist-300">{venta.cliente_nombre}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-mist-500">
                      {venta.cantidad_items} und · {venta.detalles.length} líneas
                    </td>
                    <td className="px-5 py-3 text-xs text-mist-400">{textoMetodoPago(venta.metodo_pago)}</td>
                    <td className="px-5 py-3"><EtiquetaVenta estado={venta.estado} /></td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-mist-50">
                      {formatearPrecio(venta.total)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" onClick={() => setDetalle(venta)}
                              className="btn btn-fantasma w-auto !px-3 !py-1.5 !text-[0.66rem]">
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {resumen && ventas.length > 0 && <Resumen resumen={resumen} />}
      </section>

      <Modal
        abierto={!!detalle}
        onCerrar={() => setDetalle(null)}
        titulo={detalle ? `Venta ${detalle.numero_venta}` : ''}
        descripcion={detalle ? formatearFecha(detalle.fecha_venta) : ''}
      >
        <DetalleVenta venta={detalle} token={token} alFallar={setError} />
        {puedeGestionar && detalle?.estado !== 'anulada' && (
          <button type="button" onClick={() => anular(detalle)} className="btn btn-peligro mt-4 w-full">
            Anular esta venta y devolver el inventario
          </button>
        )}
      </Modal>
    </div>
  );
}
