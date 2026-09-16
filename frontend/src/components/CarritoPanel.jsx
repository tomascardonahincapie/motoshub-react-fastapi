import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ImagenSegura from './ImagenSegura';
import Aviso from './Aviso';
import { useAuth } from '../context/AuthContext';
import { useCarrito } from '../context/CarritoContext';
import { api } from '../utils/api';
import { IVA_PORCENTAJE, formatearPrecio } from '../config';

const PAGOS = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'credito', etiqueta: 'Crédito' },
];

function Contador({ item, clave, cambiarCantidad }) {
  const tope = item.stock ?? 99;

  return (
    <div className="flex items-center gap-1 rounded-lg border border-line">
      <button
        type="button"
        onClick={() => cambiarCantidad(clave, item.cantidad - 1)}
        disabled={item.cantidad <= 1}
        aria-label="Quitar una unidad"
        className="flex h-7 w-7 items-center justify-center text-mist-400 transition-colors hover:text-mist-50 disabled:opacity-30"
      >
        −
      </button>
      <span className="w-6 text-center text-xs font-semibold tabular-nums text-mist-100">
        {item.cantidad}
      </span>
      <button
        type="button"
        onClick={() => cambiarCantidad(clave, item.cantidad + 1)}
        disabled={item.cantidad >= tope}
        aria-label="Añadir una unidad"
        className="flex h-7 w-7 items-center justify-center text-mist-400 transition-colors hover:text-mist-50 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

/**
 * Panel lateral del carrito y confirmación de la compra.
 *
 * Al confirmar se llama a POST /api/ventas: el Backend recalcula los precios
 * desde la base de datos, descuenta el inventario y emite la factura. El total
 * que se ve aquí antes de confirmar es solo una previsualización.
 */
export default function CarritoPanel() {
  const { items, abierto, cerrar, totales, quitar, cambiarCantidad, vaciar, comoPeticion, claveDe } = useCarrito();
  const { token, isAuthenticated } = useAuth();
  const navegar = useNavigate();

  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [comprobante, setComprobante] = useState(null);

  if (!abierto) return null;

  const confirmar = async () => {
    setError('');
    setEnviando(true);
    try {
      const respuesta = await api.crearVenta(
        { items: comoPeticion(), metodo_pago: metodoPago, generar_factura: true },
        token,
      );
      setComprobante(respuesta);
      vaciar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const descargar = async () => {
    try {
      await api.descargarFactura(comprobante.id_factura, comprobante.numero_factura, token);
    } catch (err) {
      setError(err.message);
    }
  };

  const cerrarTodo = () => {
    setComprobante(null);
    setError('');
    cerrar();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-ink-950/75 backdrop-blur-sm"
      onClick={cerrarTodo}
      role="dialog"
      aria-modal="true"
      aria-label="Carrito de compras"
    >
      <aside
        onClick={(evento) => evento.stopPropagation()}
        className="flex h-full w-full max-w-md animate-deslizar flex-col border-l border-line bg-ink-900 shadow-[0_0_60px_-10px_rgba(0,0,0,0.95)]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-mist-50">
              {comprobante ? 'Compra confirmada' : 'Tu carrito'}
            </h2>
            <p className="mt-0.5 text-xs text-mist-500">
              {comprobante
                ? 'Ya puedes descargar tu factura'
                : `${totales.unidades} ${totales.unidades === 1 ? 'artículo' : 'artículos'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrarTodo}
            aria-label="Cerrar el carrito"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-mist-400 transition-colors hover:border-line-strong hover:text-mist-50"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* --- Comprobante de la compra ------------------------------------ */}
        {comprobante ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ok-500/12 text-3xl">✓</span>
            <div>
              <p className="font-display text-xl font-semibold text-mist-50">
                Venta {comprobante.numero_venta}
              </p>
              <p className="mt-1 text-sm text-mist-400">
                Total pagado:{' '}
                <strong className="text-brand-400">{formatearPrecio(comprobante.total)}</strong>
              </p>
              {comprobante.numero_factura && (
                <p className="mt-1 text-xs text-mist-600">Factura {comprobante.numero_factura}</p>
              )}
            </div>

            <div className="mt-2 w-full space-y-2">
              {comprobante.id_factura && (
                <button type="button" onClick={descargar} className="btn btn-primario w-full">
                  Descargar factura en PDF
                </button>
              )}
              <button
                type="button"
                onClick={() => { cerrarTodo(); navegar('/cliente'); }}
                className="btn btn-fantasma w-full"
              >
                Ver mis compras
              </button>
            </div>
            <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-4xl opacity-30" aria-hidden="true">🛒</span>
            <p className="text-sm text-mist-500">Tu carrito está vacío.</p>
            <Link to="/catalogo" onClick={cerrarTodo} className="btn btn-fantasma mt-2 w-auto">
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <>
            {/* --- Artículos ------------------------------------------------ */}
            <ul className="flex-1 divide-y divide-line-soft overflow-y-auto px-5">
              {items.map((item) => {
                const clave = claveDe(item);
                return (
                  <li key={clave} className="flex gap-3 py-4">
                    <ImagenSegura
                      src={item.imagen}
                      alt={item.nombre}
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-mist-100">{item.nombre}</p>
                      <p className="text-xs text-mist-600">
                        {item.tipo === 'servicio' ? 'Servicio' : 'Producto'} · {formatearPrecio(item.precio)}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Contador item={item} clave={clave} cambiarCantidad={cambiarCantidad} />
                        <button
                          type="button"
                          onClick={() => quitar(clave)}
                          className="text-[0.7rem] font-semibold uppercase tracking-wider text-mist-600 transition-colors hover:text-danger-400"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                    <p className="shrink-0 self-center text-sm font-bold tabular-nums text-mist-50">
                      {formatearPrecio(item.precio * item.cantidad)}
                    </p>
                  </li>
                );
              })}
            </ul>

            {/* --- Totales y confirmación ----------------------------------- */}
            <footer className="space-y-3 border-t border-line px-5 py-4">
              <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>

              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between text-mist-400">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatearPrecio(totales.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-mist-400">
                  <dt>IVA ({IVA_PORCENTAJE}%)</dt>
                  <dd className="tabular-nums">{formatearPrecio(totales.impuestos)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-bold text-mist-50">
                  <dt>Total</dt>
                  <dd className="tabular-nums text-brand-400">{formatearPrecio(totales.total)}</dd>
                </div>
              </dl>

              {isAuthenticated ? (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">
                      Forma de pago
                    </span>
                    <select
                      value={metodoPago}
                      onChange={(evento) => setMetodoPago(evento.target.value)}
                      className="campo !mb-0 h-10 cursor-pointer !py-0 !text-xs"
                    >
                      {PAGOS.map((pago) => (
                        <option key={pago.valor} value={pago.valor}>{pago.etiqueta}</option>
                      ))}
                    </select>
                  </label>

                  <button type="button" onClick={confirmar} disabled={enviando} className="btn btn-primario w-full">
                    {enviando ? 'Registrando la venta...' : 'Confirmar compra'}
                  </button>
                </>
              ) : (
                <div className="rounded-xl border border-brand-500/30 bg-brand-500/8 p-4 text-center">
                  <p className="text-xs leading-relaxed text-mist-400">
                    Inicia sesión para confirmar la compra y recibir tu factura.
                  </p>
                  <Link to="/login" onClick={cerrarTodo} className="btn btn-primario mt-3 w-full !text-[0.7rem]">
                    Iniciar sesión
                  </Link>
                </div>
              )}
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
