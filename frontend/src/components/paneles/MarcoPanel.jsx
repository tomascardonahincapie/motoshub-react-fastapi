import { useState } from 'react';
import BarraLateral from './BarraLateral';
import MenuUsuario from '../MenuUsuario';
import Aviso from '../Aviso';
import { useAuth } from '../../context/AuthContext';

/**
 * Marco común de los tres paneles: barra lateral, cabecera fija y pie.
 *
 * El administrador, el empleado y el cliente comparten este componente, así
 * que los tres paneles se ven igual y se manejan igual. Lo único que cambia
 * es la lista de secciones y lo que se pinta dentro.
 */
export default function MarcoPanel({
  secciones,
  seccion,
  setSeccion,
  rotulo,
  mensaje,
  error,
  onCerrarMensaje,
  onCerrarError,
  onRecargar,
  cargando = false,
  acciones = null,
  children,
}) {
  const { usuario } = useAuth();
  const [menuMovil, setMenuMovil] = useState(false);

  const actual = secciones.find((s) => s.clave === seccion);

  return (
    <div className="flex min-h-screen bg-ink-950">
      <BarraLateral
        secciones={secciones}
        seccion={seccion}
        setSeccion={setSeccion}
        rotulo={rotulo}
        abiertaEnMovil={menuMovil}
        cerrarEnMovil={() => setMenuMovil(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-ink-950/85 px-4 py-3.5 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMenuMovil(true)}
            aria-label="Abrir menú"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-mist-300 transition-colors hover:border-line-strong lg:hidden"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold text-mist-50">
              {actual?.etiqueta}
            </h1>
            <p className="truncate text-xs text-mist-500">{actual?.descripcion}</p>
          </div>

          {acciones}

          {onRecargar && (
            <button
              type="button"
              onClick={onRecargar}
              disabled={cargando}
              aria-label="Recargar datos"
              title="Recargar datos"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-mist-400 transition-colors hover:border-line-strong hover:text-mist-50 disabled:opacity-40"
            >
              <svg viewBox="0 0 20 20" fill="none" className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`}>
                <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M16.5 3v3.5H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          <MenuUsuario />
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            <Aviso tipo="exito" onCerrar={onCerrarMensaje}>{mensaje}</Aviso>
            <Aviso tipo="error" onCerrar={onCerrarError}>{error}</Aviso>

            <div key={seccion} className="animate-subir">{children}</div>
          </div>
        </main>

        <footer className="border-t border-line px-6 py-3 text-center text-xs text-mist-600">
          Sesión de {usuario?.nombres} {usuario?.apellidos} · MotosHub · Ficha 3406211
        </footer>
      </div>
    </div>
  );
}
