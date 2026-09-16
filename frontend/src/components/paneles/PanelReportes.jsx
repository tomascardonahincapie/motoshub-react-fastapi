import { useCallback, useEffect, useState } from 'react';
import Aviso from '../Aviso';
import { EtiquetaVenta, textoMetodoPago } from './Etiquetas';
import { api } from '../../utils/api';
import { formatearFecha, formatearPrecio, hoyISO } from '../../config';

function Cifra({ etiqueta, valor, destacada = false }) {
  return (
    <div className={`superficie px-4 py-3 ${destacada ? '!border-brand-500/35' : ''}`}>
      <p className="text-[0.6rem] uppercase tracking-[0.14em] text-mist-600">{etiqueta}</p>
      <p className={`mt-1 font-display text-lg font-bold tabular-nums ${destacada ? 'text-brand-400' : 'text-mist-50'}`}>
        {valor}
      </p>
    </div>
  );
}

/**
 * Reporte diario de ventas y su exportación (requerimientos 4, 5 y 6).
 *
 * Lo que se ve en pantalla y lo que sale en el PDF y en el Excel proviene de
 * la misma consulta al Backend: no hay dos cálculos que puedan discrepar.
 */
export default function PanelReportes({ token }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setReporte(await api.getReporteDiario(fecha, token));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [fecha, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const exportar = async (formato) => {
    setDescargando(formato);
    setError('');
    try {
      const nombre = formato === 'pdf'
        ? await api.descargarReportePdf(fecha, token)
        : await api.descargarReporteExcel(fecha, token);
      setAviso(`Se descargó ${nombre}`);
      setTimeout(() => setAviso(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDescargando('');
    }
  };

  const resumen = reporte?.resumen;

  return (
    <div className="space-y-4">
      <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>
      <Aviso tipo="exito" onCerrar={() => setAviso('')}>{aviso}</Aviso>

      {/* --- Fecha y exportación ------------------------------------------ */}
      <section className="tarjeta flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mist-600">
            Fecha del reporte
          </span>
          <input
            type="date" value={fecha} max={hoyISO()}
            onChange={(evento) => setFecha(evento.target.value)}
            className="campo !mb-0 h-10 cursor-pointer !py-0 !text-sm"
          />
        </label>

        <button type="button" onClick={() => setFecha(hoyISO())}
                className="btn btn-fantasma h-10 w-auto !py-0 !text-[0.68rem]">
          Hoy
        </button>

        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => exportar('pdf')}
                  disabled={!!descargando || cargando}
                  className="btn btn-secundario h-10 w-auto !py-0 !text-[0.68rem]">
            {descargando === 'pdf' ? 'Generando...' : 'Exportar a PDF'}
          </button>
          <button type="button" onClick={() => exportar('excel')}
                  disabled={!!descargando || cargando}
                  className="btn btn-primario h-10 w-auto !py-0 !text-[0.68rem]">
            {descargando === 'excel' ? 'Generando...' : 'Exportar a Excel'}
          </button>
        </div>
      </section>

      {/* --- Totales del día ----------------------------------------------- */}
      {cargando ? (
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="esqueleto h-[4.6rem] w-full" />)}
        </div>
      ) : resumen ? (
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Cifra etiqueta="Ventas" valor={resumen.cantidad} />
          <Cifra etiqueta="Anuladas" valor={resumen.anuladas} />
          <Cifra etiqueta="Unidades" valor={resumen.unidades} />
          <Cifra etiqueta="Subtotal" valor={formatearPrecio(resumen.subtotal)} />
          <Cifra etiqueta="IVA" valor={formatearPrecio(resumen.impuestos)} />
          <Cifra etiqueta="Total del día" valor={formatearPrecio(resumen.total)} destacada />
        </div>
      ) : null}

      {/* --- Detalle del día ----------------------------------------------- */}
      <section className="tarjeta overflow-hidden">
        <header className="border-b border-line px-5 py-4">
          <h3 className="font-display text-base font-semibold text-mist-50">
            Ventas del {formatearFecha(`${fecha}T12:00:00`, false)}
          </h3>
          <p className="mt-0.5 text-xs text-mist-500">
            El mismo contenido que sale en el PDF y en el Excel
          </p>
        </header>

        {cargando ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="esqueleto h-12 w-full" />)}
          </div>
        ) : !reporte || reporte.ventas.length === 0 ? (
          <p className="py-14 text-center text-sm text-mist-600">
            No se registraron ventas en esta fecha.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-line bg-ink-850 text-[0.62rem] uppercase tracking-wider text-mist-600">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Venta</th>
                  <th className="px-5 py-3">Hora</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Productos y servicios</th>
                  <th className="px-5 py-3 text-center">Cant.</th>
                  <th className="px-5 py-3">Pago</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {reporte.ventas.map((venta, indice) => (
                  <tr key={venta.id_venta} className="fila-tabla">
                    <td className="px-5 py-3 text-xs tabular-nums text-mist-600">{indice + 1}</td>
                    <td className="px-5 py-3 font-semibold text-mist-100">{venta.numero_venta}</td>
                    <td className="px-5 py-3 text-xs tabular-nums text-mist-500">
                      {formatearFecha(venta.fecha_venta).split(' · ')[1]}
                    </td>
                    <td className="px-5 py-3 text-xs text-mist-300">{venta.cliente_nombre}</td>
                    <td className="px-5 py-3 text-xs text-mist-500">
                      {venta.detalles.map((d) => `${d.nombre_item} x${d.cantidad}`).join(', ')}
                    </td>
                    <td className="px-5 py-3 text-center tabular-nums text-mist-300">
                      {venta.cantidad_items}
                    </td>
                    <td className="px-5 py-3 text-xs text-mist-400">
                      {textoMetodoPago(venta.metodo_pago)}
                    </td>
                    <td className="px-5 py-3"><EtiquetaVenta estado={venta.estado} /></td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-mist-50">
                      {formatearPrecio(venta.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reporte && (
          <p className="border-t border-line px-5 py-3 text-[0.68rem] text-mist-600">
            Generado el {formatearFecha(reporte.generado)} · {reporte.negocio.nombre} ·
            NIT {reporte.negocio.nit}
          </p>
        )}
      </section>
    </div>
  );
}
