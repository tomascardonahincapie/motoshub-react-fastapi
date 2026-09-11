import { useMemo } from 'react';
import ImagenSegura from '../../components/ImagenSegura';
import { formatearPrecio } from '../../config';

function Metrica({ etiqueta, valor, detalle, icono, acento = 'brand' }) {
  const acentos = {
    brand: 'bg-brand-500/12 text-brand-400',
    ok: 'bg-ok-500/12 text-ok-400',
    info: 'bg-info-400/12 text-info-400',
    warn: 'bg-warn-400/12 text-warn-400',
  };

  return (
    <div className="metrica">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.66rem] uppercase tracking-[0.14em] text-mist-600">{etiqueta}</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-mist-50">{valor}</p>
          {detalle && <p className="mt-1 truncate text-xs text-mist-500">{detalle}</p>}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${acentos[acento]}`}>
          {icono}
        </span>
      </div>
    </div>
  );
}

/** Barra horizontal simple para comparar cantidades por rol. */
function BarraRol({ etiqueta, cantidad, total, color }) {
  const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-mist-300">{etiqueta}</span>
        <span className="tabular-nums text-mist-500">
          {cantidad} <span className="text-mist-600">({porcentaje}%)</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}

export default function SeccionResumen({ usuarios, productos, servicios, irA }) {
  const datos = useMemo(() => {
    const activos = usuarios.filter((u) => u.estado === 'activo').length;
    const porRol = (rol) => usuarios.filter((u) => u.nombre_rol === rol).length;

    const valorInventario = productos.reduce(
      (suma, p) => suma + Number(p.precio) * Number(p.stock || 0),
      0,
    );
    const sinStock = productos.filter((p) => Number(p.stock) <= 0).length;
    const unidades = productos.reduce((suma, p) => suma + Number(p.stock || 0), 0);

    return {
      activos,
      inactivos: usuarios.length - activos,
      administradores: porRol('Administrador'),
      empleados: porRol('Empleado'),
      clientes: porRol('Cliente'),
      valorInventario,
      sinStock,
      unidades,
      serviciosActivos: servicios.filter((s) => s.estado === 'activo').length,
    };
  }, [usuarios, productos, servicios]);

  const ultimosUsuarios = usuarios.slice(0, 5);
  const productosBajos = [...productos]
    .sort((a, b) => Number(a.stock) - Number(b.stock))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          etiqueta="Usuarios registrados"
          valor={usuarios.length}
          detalle={`${datos.activos} activos · ${datos.inactivos} inactivos`}
          icono="👥"
          acento="brand"
        />
        <Metrica
          etiqueta="Productos"
          valor={productos.length}
          detalle={`${datos.unidades} unidades en stock`}
          icono="📦"
          acento="info"
        />
        <Metrica
          etiqueta="Servicios"
          valor={servicios.length}
          detalle={`${datos.serviciosActivos} publicados`}
          icono="🔧"
          acento="ok"
        />
        <Metrica
          etiqueta="Valor del inventario"
          valor={formatearPrecio(datos.valorInventario)}
          detalle={datos.sinStock > 0 ? `${datos.sinStock} productos agotados` : 'Todo con stock'}
          icono="💰"
          acento="warn"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Distribución por rol */}
        <section className="tarjeta p-5">
          <h3 className="font-display text-base font-semibold text-mist-50">Usuarios por rol</h3>
          <p className="mt-0.5 text-xs text-mist-500">Cómo se reparten las cuentas del sistema</p>

          <div className="mt-5 space-y-4">
            <BarraRol etiqueta="Administradores" cantidad={datos.administradores} total={usuarios.length} color="bg-brand-500" />
            <BarraRol etiqueta="Empleados" cantidad={datos.empleados} total={usuarios.length} color="bg-ok-500" />
            <BarraRol etiqueta="Clientes" cantidad={datos.clientes} total={usuarios.length} color="bg-info-400" />
          </div>

          <button type="button" onClick={() => irA('usuarios')} className="btn btn-fantasma mt-6 w-full !text-[0.7rem]">
            Gestionar usuarios
          </button>
        </section>

        {/* Stock más bajo */}
        <section className="tarjeta p-5">
          <h3 className="font-display text-base font-semibold text-mist-50">Stock más bajo</h3>
          <p className="mt-0.5 text-xs text-mist-500">Productos que conviene reponer pronto</p>

          <ul className="mt-4 space-y-2.5">
            {productosBajos.length === 0 && (
              <li className="py-6 text-center text-sm text-mist-600">Aún no hay productos.</li>
            )}
            {productosBajos.map((producto) => (
              <li key={producto.id_producto} className="flex items-center gap-3">
                <ImagenSegura
                  src={producto.imagen}
                  alt={producto.nombre}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-mist-100">{producto.nombre}</p>
                  <p className="text-xs text-mist-600">{formatearPrecio(producto.precio)}</p>
                </div>
                <span className={`etiqueta ${Number(producto.stock) <= 0 ? 'etiqueta-peligro' : Number(producto.stock) <= 5 ? 'etiqueta-marca' : 'etiqueta-neutra'}`}>
                  {producto.stock} und
                </span>
              </li>
            ))}
          </ul>

          <button type="button" onClick={() => irA('productos')} className="btn btn-fantasma mt-5 w-full !text-[0.7rem]">
            Gestionar productos
          </button>
        </section>
      </div>

      {/* Últimos registros */}
      <section className="tarjeta overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-mist-50">Últimos registros</h3>
            <p className="mt-0.5 text-xs text-mist-500">Las cuentas creadas más recientemente</p>
          </div>
          <button type="button" onClick={() => irA('usuarios')} className="btn btn-fantasma w-auto !py-1.5 !text-[0.68rem]">
            Ver todos
          </button>
        </header>

        <div className="divide-y divide-line">
          {ultimosUsuarios.length === 0 && (
            <p className="py-10 text-center text-sm text-mist-600">Todavía no hay usuarios.</p>
          )}
          {ultimosUsuarios.map((usuario) => (
            <div key={usuario.id_usuario} className="fila-tabla flex items-center gap-3 px-5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[0.7rem] font-black text-white">
                {(usuario.nombres[0] + (usuario.apellidos?.[0] || '')).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-mist-100">
                  {usuario.nombres} {usuario.apellidos}
                </p>
                <p className="truncate text-xs text-mist-600">{usuario.email}</p>
              </div>
              <span className="etiqueta etiqueta-neutra hidden sm:inline-flex">{usuario.nombre_rol}</span>
              <span className={`etiqueta ${usuario.estado === 'activo' ? 'etiqueta-ok' : 'etiqueta-peligro'}`}>
                {usuario.estado}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
