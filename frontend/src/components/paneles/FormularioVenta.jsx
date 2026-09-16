import { useMemo, useState } from 'react';
import Modal from '../Modal';
import Aviso from '../Aviso';
import { api } from '../../utils/api';
import { IVA_PORCENTAJE, formatearPrecio } from '../../config';

const PAGOS = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'credito', etiqueta: 'Crédito (queda pendiente de cobro)' },
];

/**
 * Registro de una venta desde el panel (requerimientos 1 y 2).
 *
 * Aquí solo se elige qué se vende y a quién: los precios los pone FastAPI
 * leyendo el catálogo. El total que se ve abajo es una previsualización.
 */
export default function FormularioVenta({ abierto, onCerrar, token, clientes, productos, servicios, alGuardar }) {
  const [clienteId, setClienteId] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState([]);
  const [seleccion, setSeleccion] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const catalogo = useMemo(() => [
    ...productos.map((p) => ({
      clave: `producto-${p.id_producto}`, tipo: 'producto', id: p.id_producto,
      nombre: p.nombre, precio: Number(p.precio), stock: Number(p.stock),
    })),
    ...servicios.map((s) => ({
      clave: `servicio-${s.id_servicio}`, tipo: 'servicio', id: s.id_servicio,
      nombre: s.nombre, precio: Number(s.precio), stock: null,
    })),
  ], [productos, servicios]);

  const totales = useMemo(() => {
    const subtotal = lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0);
    const impuestos = Math.round((subtotal * IVA_PORCENTAJE) / 100);
    return { subtotal, impuestos, total: subtotal + impuestos };
  }, [lineas]);

  const agregar = () => {
    const articulo = catalogo.find((a) => a.clave === seleccion);
    if (!articulo) return;

    setLineas((previas) => {
      const existente = previas.find((l) => l.clave === articulo.clave);
      if (existente) {
        return previas.map((l) =>
          l.clave === articulo.clave ? { ...l, cantidad: l.cantidad + Number(cantidad) } : l,
        );
      }
      return [...previas, { ...articulo, cantidad: Number(cantidad) }];
    });

    setSeleccion('');
    setCantidad(1);
  };

  const limpiar = () => {
    setLineas([]);
    setClienteId('');
    setObservaciones('');
    setMetodoPago('efectivo');
    setError('');
  };

  const guardar = async () => {
    setError('');
    if (!clienteId) return setError('Elige el cliente al que se le factura la venta');
    if (lineas.length === 0) return setError('Añade al menos un producto o servicio');

    setEnviando(true);
    try {
      const respuesta = await api.crearVenta({
        cliente_id: Number(clienteId),
        metodo_pago: metodoPago,
        observaciones: observaciones || null,
        generar_factura: true,
        items: lineas.map((l) => ({ tipo_item: l.tipo, id_item: l.id, cantidad: l.cantidad })),
      }, token);

      limpiar();
      onCerrar();
      alGuardar(`Venta ${respuesta.numero_venta} registrada · Factura ${respuesta.numero_factura}`);
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
      titulo="Registrar una venta"
      descripcion="Los precios se toman del catálogo al confirmar"
      ancho="max-w-3xl"
    >
      <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
            Cliente
          </span>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="campo cursor-pointer">
            <option value="">Selecciona el cliente</option>
            {clientes.map((c) => (
              <option key={c.id_usuario} value={c.id_usuario}>
                {c.nombres} {c.apellidos} · {c.numero_documento}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
            Forma de pago
          </span>
          <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="campo cursor-pointer">
            {PAGOS.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
          </select>
        </label>
      </div>

      {/* --- Añadir artículos --------------------------------------------- */}
      <div className="mt-2 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-ink-850 p-3">
        <label className="min-w-[12rem] flex-1">
          <span className="mb-1 block text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">Artículo</span>
          <select value={seleccion} onChange={(e) => setSeleccion(e.target.value)}
                  className="campo !mb-0 h-9 cursor-pointer !py-0 !text-xs">
            <option value="">Elige un producto o servicio</option>
            {catalogo.map((a) => (
              <option key={a.clave} value={a.clave} disabled={a.stock === 0}>
                {a.nombre} · {formatearPrecio(a.precio)}
                {a.stock !== null ? ` · ${a.stock} und` : ' · servicio'}
              </option>
            ))}
          </select>
        </label>

        <label className="w-24">
          <span className="mb-1 block text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">Cantidad</span>
          <input type="number" min="1" max="999" value={cantidad}
                 onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                 className="campo !mb-0 h-9 !py-0 !text-xs" />
        </label>

        <button type="button" onClick={agregar} disabled={!seleccion}
                className="btn btn-secundario h-9 w-auto !py-0 !text-[0.68rem]">
          Añadir
        </button>
      </div>

      {/* --- Líneas de la venta -------------------------------------------- */}
      {lineas.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-ink-850 text-[0.62rem] uppercase tracking-wider text-mist-600">
              <tr>
                <th className="px-4 py-2.5">Artículo</th>
                <th className="px-4 py-2.5 text-center">Cant.</th>
                <th className="px-4 py-2.5 text-right">Precio</th>
                <th className="px-4 py-2.5 text-right">Subtotal</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {lineas.map((linea) => (
                <tr key={linea.clave}>
                  <td className="px-4 py-2.5">
                    <p className="text-mist-100">{linea.nombre}</p>
                    <p className="text-[0.66rem] text-mist-600">{linea.tipo}</p>
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-mist-300">{linea.cantidad}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-mist-400">
                    {formatearPrecio(linea.precio)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-mist-100">
                    {formatearPrecio(linea.precio * linea.cantidad)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setLineas((p) => p.filter((l) => l.clave !== linea.clave))}
                      aria-label={`Quitar ${linea.nombre}`}
                      className="text-mist-600 transition-colors hover:text-danger-400"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="space-y-1 border-t border-line px-4 py-3 text-xs">
            <div className="flex justify-between text-mist-500">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatearPrecio(totales.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-mist-500">
              <dt>IVA ({IVA_PORCENTAJE}%)</dt>
              <dd className="tabular-nums">{formatearPrecio(totales.impuestos)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-sm font-bold text-mist-50">
              <dt>Total</dt>
              <dd className="tabular-nums text-brand-400">{formatearPrecio(totales.total)}</dd>
            </div>
          </dl>
        </div>
      )}

      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
          Observaciones (opcional)
        </span>
        <input
          type="text" value={observaciones} maxLength={255}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Entrega en tienda, garantía extendida..."
          className="campo"
        />
      </label>

      <div className="mt-2 flex gap-3">
        <button type="button" onClick={onCerrar} className="btn btn-fantasma flex-1">
          Cancelar
        </button>
        <button type="button" onClick={guardar} disabled={enviando} className="btn btn-primario flex-1">
          {enviando ? 'Registrando...' : 'Registrar venta y facturar'}
        </button>
      </div>
    </Modal>
  );
}
