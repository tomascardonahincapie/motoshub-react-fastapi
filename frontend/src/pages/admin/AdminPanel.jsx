import { useCallback, useEffect, useState } from 'react';
import AdminSidebar, { SECCIONES } from '../../components/AdminSidebar';
import MenuUsuario from '../../components/MenuUsuario';
import Aviso from '../../components/Aviso';
import SeccionResumen from './SeccionResumen';
import SeccionUsuarios from './SeccionUsuarios';
import SeccionCatalogo from './SeccionCatalogo';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const DESCRIPCIONES = {
  resumen: 'Vista general de la operación',
  usuarios: 'Crea, edita, activa o elimina cuentas',
  productos: 'Administra el catálogo de la tienda',
  servicios: 'Administra los servicios del taller',
};

export default function AdminPanel() {
  const { usuario, token } = useAuth();

  const [seccion, setSeccion] = useState('resumen');
  const [menuMovil, setMenuMovil] = useState(false);

  const [usuarios, setUsuarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const avisar = useCallback((texto) => {
    setError('');
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3500);
  }, []);

  const alFallar = useCallback((texto) => {
    setMensaje('');
    setError(texto);
  }, []);

  // Una sola carga alimenta todas las secciones y el resumen.
  const cargarTodo = useCallback(async () => {
    setCargando(true);
    try {
      const [u, p, s] = await Promise.all([
        api.getUsuarios(token),
        api.getProductos(),
        api.getServicios(),
      ]);
      setUsuarios(u.usuarios || []);
      setProductos(p.productos || []);
      setServicios(s.servicios || []);
      setError('');
    } catch (err) {
      alFallar(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, alFallar]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const seccionActual = SECCIONES.find((s) => s.clave === seccion);

  return (
    <div className="flex min-h-screen bg-ink-950">
      <AdminSidebar
        seccion={seccion}
        setSeccion={setSeccion}
        abiertaEnMovil={menuMovil}
        cerrarEnMovil={() => setMenuMovil(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabecera */}
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
              {seccionActual?.etiqueta}
            </h1>
            <p className="truncate text-xs text-mist-500">{DESCRIPCIONES[seccion]}</p>
          </div>

          <button
            type="button"
            onClick={cargarTodo}
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

          <MenuUsuario />
        </header>

        {/* Contenido */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            <Aviso tipo="exito" onCerrar={() => setMensaje('')}>{mensaje}</Aviso>
            <Aviso tipo="error" onCerrar={() => setError('')}>{error}</Aviso>

            {cargando ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="esqueleto h-28 w-full" />
                  ))}
                </div>
                <div className="esqueleto h-80 w-full" />
              </div>
            ) : (
              <div key={seccion} className="animate-subir">
                {seccion === 'resumen' && (
                  <SeccionResumen
                    usuarios={usuarios}
                    productos={productos}
                    servicios={servicios}
                    irA={setSeccion}
                  />
                )}

                {seccion === 'usuarios' && (
                  <SeccionUsuarios
                    usuarios={usuarios}
                    recargar={cargarTodo}
                    avisar={avisar}
                    alFallar={alFallar}
                  />
                )}

                {seccion === 'productos' && (
                  <SeccionCatalogo
                    tipo="producto"
                    items={productos}
                    recargar={cargarTodo}
                    avisar={avisar}
                    alFallar={alFallar}
                  />
                )}

                {seccion === 'servicios' && (
                  <SeccionCatalogo
                    tipo="servicio"
                    items={servicios}
                    recargar={cargarTodo}
                    avisar={avisar}
                    alFallar={alFallar}
                  />
                )}
              </div>
            )}
          </div>
        </main>

        <footer className="border-t border-line px-6 py-3 text-center text-xs text-mist-600">
          Sesión de {usuario?.nombres} {usuario?.apellidos} · MotosHub · Ficha 3406211
        </footer>
      </div>
    </div>
  );
}
