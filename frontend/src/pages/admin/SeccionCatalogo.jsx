import { useMemo, useState } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Modal from '../../components/Modal';
import ImagenSegura from '../../components/ImagenSegura';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { formatearPrecio } from '../../config';

const categorias = [
  { value: 'Motos', label: 'Motos' },
  { value: 'Repuestos', label: 'Repuestos' },
  { value: 'Accesorios', label: 'Accesorios' },
  { value: 'Cascos', label: 'Cascos' },
  { value: 'Lubricantes', label: 'Lubricantes' },
];

const estados = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
];

const productoVacio = {
  nombre: '', descripcion: '', precio: '', stock: '',
  categoria: '', imagen: '', estado: 'activo',
};

const servicioVacio = {
  nombre: '', descripcion: '', precio: '', duracion_minutos: '',
  imagen: '', estado: 'activo',
};

/**
 * Gestión del catálogo. El mismo componente sirve para productos y para
 * servicios: solo cambian los campos propios de cada entidad y los endpoints.
 */
export default function SeccionCatalogo({ tipo, items, recargar, avisar, alFallar }) {
  const { token } = useAuth();
  const esServicio = tipo === 'servicio';

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(esServicio ? servicioVacio : productoVacio);
  const [errorFormulario, setErrorFormulario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const clave = esServicio ? 'id_servicio' : 'id_producto';
  const titulo = esServicio ? 'servicio' : 'producto';

  const visibles = useMemo(() => {
    const aguja = busqueda.trim().toLowerCase();
    if (!aguja) return items;
    return items.filter((item) =>
      `${item.nombre} ${item.descripcion || ''} ${item.categoria || ''}`.toLowerCase().includes(aguja),
    );
  }, [items, busqueda]);

  const alCambiar = (evento) => {
    const { name, value } = evento.target;
    setFormulario((previo) => ({ ...previo, [name]: value }));
  };

  const abrirNuevo = () => {
    setEditandoId(null);
    setFormulario(esServicio ? servicioVacio : productoVacio);
    setErrorFormulario('');
    setModalAbierto(true);
  };

  const abrirEditar = (item) => {
    setEditandoId(item[clave]);
    setFormulario(
      esServicio
        ? {
            nombre: item.nombre,
            descripcion: item.descripcion || '',
            precio: item.precio,
            duracion_minutos: item.duracion_minutos || '',
            imagen: item.imagen || '',
            estado: item.estado,
          }
        : {
            nombre: item.nombre,
            descripcion: item.descripcion || '',
            precio: item.precio,
            stock: item.stock,
            categoria: item.categoria || '',
            imagen: item.imagen || '',
            estado: item.estado,
          },
    );
    setErrorFormulario('');
    setModalAbierto(true);
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    setErrorFormulario('');

    if (!formulario.nombre.trim() || formulario.precio === '') {
      setErrorFormulario('El nombre y el precio son obligatorios.');
      return;
    }

    const carga = esServicio
      ? {
          ...formulario,
          precio: Number(formulario.precio),
          duracion_minutos: formulario.duracion_minutos ? Number(formulario.duracion_minutos) : null,
        }
      : {
          ...formulario,
          precio: Number(formulario.precio),
          stock: Number(formulario.stock) || 0,
        };

    setGuardando(true);
    try {
      if (editandoId) {
        await (esServicio
          ? api.updateServicio(editandoId, carga, token)
          : api.updateProducto(editandoId, carga, token));
        avisar(`El ${titulo} se actualizó correctamente`);
      } else {
        await (esServicio
          ? api.createServicio(carga, token)
          : api.createProducto(carga, token));
        avisar(`El ${titulo} se creó correctamente`);
      }
      setModalAbierto(false);
      recargar();
    } catch (err) {
      setErrorFormulario(err.message);
      alFallar(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (item) => {
    if (!confirm(`¿Eliminar el ${titulo} "${item.nombre}"?`)) return;
    try {
      await (esServicio
        ? api.deleteServicio(item[clave], token)
        : api.deleteProducto(item[clave], token));
      avisar(`El ${titulo} se eliminó correctamente`);
      recargar();
    } catch (err) {
      alFallar(err.message);
    }
  };

  return (
    <>
      <div className="superficie mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={`Buscar un ${titulo}...`}
          aria-label={`Buscar ${titulo}s`}
          className="campo flex-1"
        />
        <Button onClick={abrirNuevo} ancho="auto" className="sm:shrink-0">
          + Nuevo {titulo}
        </Button>
      </div>

      <div className="tarjeta overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-ink-900/60 text-left text-[0.68rem] uppercase tracking-wider text-mist-500">
                <th className="px-4 py-3 font-semibold">{esServicio ? 'Servicio' : 'Producto'}</th>
                <th className="px-4 py-3 font-semibold">{esServicio ? 'Duración' : 'Categoría'}</th>
                <th className="px-4 py-3 font-semibold">Precio</th>
                {!esServicio && <th className="px-4 py-3 font-semibold">Stock</th>}
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={esServicio ? 5 : 6} className="px-4 py-14 text-center text-mist-600">
                    {items.length === 0 ? `No hay ${titulo}s registrados.` : 'Ningún resultado coincide con la búsqueda.'}
                  </td>
                </tr>
              ) : (
                visibles.map((item) => (
                  <tr key={item[clave]} className="fila-tabla">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ImagenSegura
                          src={item.imagen}
                          alt={item.nombre}
                          icono={esServicio ? '🔧' : '🏍️'}
                          className="h-11 w-11 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0 max-w-xs">
                          <p className="truncate font-medium text-mist-50">{item.nombre}</p>
                          {item.descripcion && (
                            <p className="truncate text-xs text-mist-600">{item.descripcion}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-mist-400">
                      {esServicio
                        ? item.duracion_minutos
                          ? `${item.duracion_minutos} min`
                          : '—'
                        : item.categoria || '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-mist-100">
                      {formatearPrecio(item.precio)}
                    </td>
                    {!esServicio && (
                      <td className="px-4 py-3">
                        <span className={`etiqueta ${Number(item.stock) <= 0 ? 'etiqueta-peligro' : Number(item.stock) <= 5 ? 'etiqueta-marca' : 'etiqueta-neutra'}`}>
                          {item.stock} und
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`etiqueta ${item.estado === 'activo' ? 'etiqueta-ok' : 'etiqueta-peligro'}`}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => abrirEditar(item)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-mist-400 transition-colors hover:bg-white/6 hover:text-brand-400">
                          Editar
                        </button>
                        <button type="button" onClick={() => eliminar(item)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-mist-400 transition-colors hover:bg-danger-500/10 hover:text-danger-400">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {visibles.length > 0 && (
          <div className="border-t border-line px-4 py-2.5 text-xs text-mist-600">
            Mostrando {visibles.length} de {items.length} {titulo}s
          </div>
        )}
      </div>

      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={`${editandoId ? 'Editar' : 'Nuevo'} ${titulo}`}
        descripcion="La imagen puede ser una ruta del proyecto (/img/...) o una URL completa."
      >
        <form onSubmit={enviar}>
          {errorFormulario && (
            <p className="mb-4 rounded-lg border border-danger-500/30 bg-danger-500/10 p-3 text-sm text-danger-400">
              {errorFormulario}
            </p>
          )}

          <Input label="Nombre" name="nombre" value={formulario.nombre} onChange={alCambiar} maxLength={100} />
          <Input label="Descripción" name="descripcion" value={formulario.descripcion} onChange={alCambiar} maxLength={255} />

          <div className="grid gap-x-4 sm:grid-cols-2">
            <Input label="Precio (COP)" name="precio" type="number" value={formulario.precio} onChange={alCambiar} />
            {esServicio ? (
              <Input label="Duración (minutos)" name="duracion_minutos" type="number" value={formulario.duracion_minutos} onChange={alCambiar} ayuda="Déjalo vacío si es variable" />
            ) : (
              <Input label="Stock" name="stock" type="number" value={formulario.stock} onChange={alCambiar} />
            )}
          </div>

          <div className="grid gap-x-4 sm:grid-cols-2">
            {!esServicio && (
              <Select label="Categoría" name="categoria" value={formulario.categoria} onChange={alCambiar} options={categorias} />
            )}
            <Select label="Estado" name="estado" value={formulario.estado} onChange={alCambiar} options={estados} placeholder="Selecciona el estado" />
          </div>

          <Input label="Imagen" name="imagen" value={formulario.imagen} onChange={alCambiar} maxLength={255} placeholder="/img/productos/casco-integral.jpg" />

          {/* Vista previa en vivo de la imagen */}
          {formulario.imagen && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-ink-900 p-3">
              <ImagenSegura
                src={formulario.imagen}
                alt="Vista previa"
                icono={esServicio ? '🔧' : '🏍️'}
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
              <p className="text-xs text-mist-500">
                Vista previa. Si aparece «Sin imagen», revisa la ruta o el enlace.
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" ancho="auto" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" ancho="auto" disabled={guardando}>
              {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : `Crear ${titulo}`}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
