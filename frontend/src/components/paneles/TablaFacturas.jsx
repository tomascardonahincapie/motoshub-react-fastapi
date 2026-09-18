import { useCallback, useEffect, useState } from 'react';
import Aviso from '../Aviso';
import { EtiquetaFactura } from './Etiquetas';
import { api } from '../../utils/api';
import { usePeticionVigente } from '../../utils/peticionVigente';
import { formatearFecha, formatearPrecio } from '../../config';

const ESTADOS = [
  { valor: '', etiqueta: 'Todos los estados' },
  { valor: 'emitida', etiqueta: 'Emitidas' },
  { valor: 'pagada', etiqueta: 'Pagadas' },
  { valor: 'anulada', etiqueta: 'Anuladas' },
];

const VACIOS = { desde: '', hasta: '', estado: '', busqueda: '' };

/**
 * Consulta y descarga de facturas (requerimientos 8 y 9).
 *
 * Igual que el historial de ventas, el mismo componente vale para los tres
 * roles: el cliente recibe del Backend solo sus propias facturas.
 */
export default function TablaFacturas({ token, puedeGestionar = false, titulo = 'Facturas emitidas' }) {
  const vigente = usePeticionVigente();
  const [filtros, setFiltros] = useState(VACIOS);
  const [facturas, setFacturas] = useState([]);
  const [totalFacturado, setTotalFacturado] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(null);

  const cargar = useCallback(async () => {
    const esVigente = vigente();
    setCargando(true);
    try {
      const datos = await api.getFacturas(filtros, token);
      if (!esVigente()) return;
      setFacturas(datos.facturas);
      setTotalFacturado(datos.total_facturado);
      setError('');
    } catch (err) {
      if (esVigente()) setError(err.message);
    } finally {
      if (esVigente()) setCargando(false);
    }
  }, [filtros, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const descargar = async (factura) => {
    setDescargando(factura.id_factura);
    try {
      await api.descargarFactura(factura.id_factura, factura.numero_factura, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setDescargando(null);
    }
  };

  const marcarPagada = async (factura) => {
    try {
      await api.cambiarEstadoFactura(factura.id_factura, 'pagada', token);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const cambiar = (campo) => (evento) =>
    setFiltros((previos) => ({ ...previos, [campo]: evento.target.value }));

  return (
    <div className="space-y-4">
      <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>

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
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
            <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">Buscar</span>
            <input type="search" value={filtros.busqueda} onChange={cambiar('busqueda')}
                   placeholder="N.º de factura, cliente o documento..."
                   className="campo !mb-0 h-9 !py-0 !text-xs" />
          </label>
          <button type="button" onClick={() => setFiltros(VACIOS)}
                  className="btn btn-fantasma h-9 w-auto !py-0 !text-[0.68rem]">
            Limpiar
          </button>
        </div>
      </section>

      <section className="tarjeta overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-mist-50">{titulo}</h3>
            <p className="mt-0.5 text-xs text-mist-500">
              {facturas.length} facturas · {formatearPrecio(totalFacturado)} facturado
            </p>
          </div>
        </header>

        {cargando ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="esqueleto h-12 w-full" />)}
          </div>
        ) : facturas.length === 0 ? (
          <p className="py-14 text-center text-sm text-mist-600">
            Todavía no hay facturas con estos criterios.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[50rem] text-left text-sm">
              <thead className="border-b border-line bg-ink-850 text-[0.62rem] uppercase tracking-wider text-mist-600">
                <tr>
                  <th className="px-5 py-3">Factura</th>
                  <th className="px-5 py-3">Emisión</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Documento</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {facturas.map((factura) => (
                  <tr key={factura.id_factura} className="fila-tabla">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-mist-100">{factura.numero_factura}</p>
                      <p className="text-[0.66rem] text-mist-600">{factura.numero_venta}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-mist-400">
                      {formatearFecha(factura.fecha_emision)}
                    </td>
                    <td className="px-5 py-3 text-xs text-mist-300">{factura.cliente_nombre}</td>
                    <td className="px-5 py-3 text-xs tabular-nums text-mist-500">{factura.cliente_documento}</td>
                    <td className="px-5 py-3"><EtiquetaFactura estado={factura.estado} /></td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-mist-50">
                      {formatearPrecio(factura.total)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        {puedeGestionar && factura.estado === 'emitida' && (
                          <button type="button" onClick={() => marcarPagada(factura)}
                                  className="btn btn-fantasma w-auto !px-2.5 !py-1.5 !text-[0.64rem]">
                            Marcar pagada
                          </button>
                        )}
                        <button type="button" onClick={() => descargar(factura)}
                                disabled={descargando === factura.id_factura}
                                className="btn btn-primario w-auto !px-2.5 !py-1.5 !text-[0.64rem]">
                          {descargando === factura.id_factura ? '...' : 'PDF'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
