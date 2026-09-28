import { useState } from 'react';
import { Link } from 'react-router-dom';
import ImagenSegura from './ImagenSegura';
import IconoWhatsApp from './IconoWhatsApp';
import Aviso from './Aviso';
import { useAuth } from '../context/AuthContext';
import { useCarrito } from '../context/CarritoContext';
import { api } from '../utils/api';
import { IVA_PORCENTAJE, enlacePedido, formatearPrecio } from '../config';

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
 * Panel lateral del pedido.
 *
 * Aquí no se cobra nada. El cliente arma su lista, ve el total de referencia y
 * lo envía por WhatsApp; el trato se cierra hablando y la venta la registra
 * después quien atiende, desde el panel, cuando ya está acordada. Por eso este
 * panel no llama a POST /api/ventas: ese endpoint quedó reservado a
 * Administrador y Empleado.
 */
export default function CarritoPanel() {
  const { items, abierto, cerrar, totales, quitar, cambiarCantidad, vaciar, comoPeticion, claveDe } = useCarrito();
  const { token, isAuthenticated } = useAuth();

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  if (!abierto) return null;

  // El pedido queda registrado en el panel antes de abrir WhatsApp, para que
  // el personal sepa que se pidio aunque la conversacion se pierda. Se abre la
  // pestaña de todos modos: si el registro falla, el cliente no se queda sin
  // poder escribir.
  const enviarPedido = async () => {
    setError('');
    setEnviando(true);
    try {
      await api.crearSolicitud({ items: comoPeticion() }, token);
    } catch (err) {
      setError(err.message || 'No pudimos registrar el pedido, pero puedes escribirnos igual.');
    } finally {
      setEnviando(false);
      window.open(enlacePedido(items, totales), '_blank', 'noopener,noreferrer');
      cerrar();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-ink-950/75 backdrop-blur-sm"
      onClick={cerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Tu pedido"
    >
      <aside
        onClick={(evento) => evento.stopPropagation()}
        className="flex h-full w-full max-w-md animate-deslizar flex-col border-l border-line bg-ink-900 shadow-[0_0_60px_-10px_rgba(0,0,0,0.95)]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-mist-50">Tu pedido</h2>
            <p className="mt-0.5 text-xs text-mist-500">
              {totales.unidades} {totales.unidades === 1 ? 'artículo' : 'artículos'}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar el pedido"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-mist-400 transition-colors hover:border-line-strong hover:text-mist-50"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-4xl opacity-30" aria-hidden="true">🛒</span>
            <p className="text-sm text-mist-500">Todavía no has añadido nada.</p>
            <Link to="/catalogo" onClick={cerrar} className="btn btn-fantasma mt-2 w-auto">
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
                        {item.tipo === 'servicio' ? 'Servicio' : 'Moto'} · {formatearPrecio(item.precio)}
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

            {/* --- Totales y envío del pedido ------------------------------- */}
            <footer className="space-y-3 border-t border-line px-5 py-4">
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
                  <dt>Total aproximado</dt>
                  <dd className="tabular-nums text-brand-400">{formatearPrecio(totales.total)}</dd>
                </div>
              </dl>

              <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>

              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={enviarPedido}
                    disabled={enviando}
                    className="btn btn-whatsapp flex w-full items-center justify-center gap-2"
                  >
                    <IconoWhatsApp className="h-4 w-4" />
                    {enviando ? 'Registrando el pedido...' : 'Enviar pedido por WhatsApp'}
                  </button>

                  <p className="text-center text-[0.7rem] leading-relaxed text-mist-600">
                    No se cobra nada aquí. Tu pedido queda registrado y te escribimos
                    para confirmar disponibilidad, la forma de pago y la entrega.
                  </p>
                </>
              ) : (
                <div className="rounded-xl border border-brand-500/30 bg-brand-500/8 p-4 text-center">
                  <p className="text-xs leading-relaxed text-mist-400">
                    Entra con tu cuenta para enviar el pedido. Así queda registrado
                    a tu nombre y puedes seguirlo desde tu panel.
                  </p>
                  <Link to="/login" onClick={cerrar} className="btn btn-primario mt-3 w-full !text-[0.7rem]">
                    Iniciar sesión
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={vaciar}
                className="w-full text-center text-[0.7rem] font-semibold uppercase tracking-wider text-mist-600 transition-colors hover:text-danger-400"
              >
                Vaciar el pedido
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
