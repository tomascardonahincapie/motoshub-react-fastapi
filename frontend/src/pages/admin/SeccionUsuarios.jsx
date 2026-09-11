import { useMemo, useState } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { validateField } from '../../utils/validators';

const tiposDocumento = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PA', label: 'Pasaporte' },
];

const roles = [
  { value: '3', label: 'Cliente' },
  { value: '2', label: 'Empleado' },
  { value: '1', label: 'Administrador' },
];

const COLOR_ROL = {
  Administrador: 'etiqueta-marca',
  Empleado: 'etiqueta-ok',
  Cliente: 'etiqueta-neutra',
};

const usuarioVacio = {
  nombres: '', apellidos: '', tipo_documento: '', numero_documento: '',
  direccion: '', telefono: '', email: '', password: '', rol_id: '3',
};

export default function SeccionUsuarios({ usuarios, recargar, avisar, alFallar }) {
  const { usuario: usuarioActual, token } = useAuth();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(usuarioVacio);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const visibles = useMemo(() => {
    const aguja = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      const texto = `${u.nombres} ${u.apellidos} ${u.email} ${u.numero_documento}`.toLowerCase();
      return (
        (!aguja || texto.includes(aguja)) &&
        (filtroRol === 'todos' || u.nombre_rol === filtroRol) &&
        (filtroEstado === 'todos' || u.estado === filtroEstado)
      );
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  const alCambiar = (evento) => {
    const { name, value } = evento.target;
    const actualizado = { ...formulario, [name]: value };
    setFormulario(actualizado);
    if (name !== 'rol_id') {
      setErrores((previo) => ({ ...previo, [name]: validateField(name, value, actualizado) }));
    }
  };

  const abrirNuevo = () => {
    setEditandoId(null);
    setFormulario(usuarioVacio);
    setErrores({});
    setModalAbierto(true);
  };

  const abrirEditar = (u) => {
    setEditandoId(u.id_usuario);
    setFormulario({
      nombres: u.nombres, apellidos: u.apellidos, tipo_documento: u.tipo_documento,
      numero_documento: u.numero_documento, direccion: u.direccion, telefono: u.telefono,
      email: u.email, password: '', rol_id: String(u.rol_id),
    });
    setErrores({});
    setModalAbierto(true);
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    try {
      if (editandoId) {
        await api.updateUsuario(editandoId, formulario, token);
        avisar('Usuario actualizado correctamente');
      } else {
        await api.createUsuario(formulario, token);
        avisar('Usuario creado correctamente');
      }
      setModalAbierto(false);
      recargar();
    } catch (err) {
      if (err.errors) setErrores((previo) => ({ ...previo, ...err.errors }));
      alFallar(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (u) => {
    const nuevo = u.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await api.cambiarEstadoUsuario(u.id_usuario, nuevo, token);
      avisar(`Usuario marcado como ${nuevo}`);
      recargar();
    } catch (err) {
      alFallar(err.message);
    }
  };

  const eliminar = async (u) => {
    if (!confirm(`¿Eliminar definitivamente a ${u.nombres} ${u.apellidos}?`)) return;
    try {
      await api.deleteUsuario(u.id_usuario, token);
      avisar('Usuario eliminado correctamente');
      recargar();
    } catch (err) {
      alFallar(err.message);
    }
  };

  return (
    <>
      {/* Filtros */}
      <div className="superficie mb-5 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, correo o documento..."
          aria-label="Buscar usuarios"
          className="campo flex-1"
        />
        <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} aria-label="Filtrar por rol" className="campo cursor-pointer lg:w-44">
          <option value="todos">Todos los roles</option>
          <option value="Administrador">Administrador</option>
          <option value="Empleado">Empleado</option>
          <option value="Cliente">Cliente</option>
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar por estado" className="campo cursor-pointer lg:w-40">
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <Button onClick={abrirNuevo} ancho="auto" className="lg:shrink-0">+ Nuevo usuario</Button>
      </div>

      {/* Tabla */}
      <div className="tarjeta overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-ink-900/60 text-left text-[0.68rem] uppercase tracking-wider text-mist-500">
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">Documento</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-mist-600">
                    {usuarios.length === 0 ? 'No hay usuarios registrados.' : 'Ningún usuario coincide con los filtros.'}
                  </td>
                </tr>
              ) : (
                visibles.map((u) => (
                  <tr key={u.id_usuario} className="fila-tabla">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[0.7rem] font-black text-white">
                          {(u.nombres[0] + (u.apellidos?.[0] || '')).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-mist-50">{u.nombres} {u.apellidos}</p>
                          <p className="truncate text-xs text-mist-600">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-mist-400">
                      <span className="text-xs text-mist-600">{u.tipo_documento}</span> {u.numero_documento}
                    </td>
                    <td className="px-4 py-3 text-mist-400">{u.telefono}</td>
                    <td className="px-4 py-3">
                      <span className={`etiqueta ${COLOR_ROL[u.nombre_rol] || 'etiqueta-neutra'}`}>{u.nombre_rol}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`etiqueta ${u.estado === 'activo' ? 'etiqueta-ok' : 'etiqueta-peligro'}`}>
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => abrirEditar(u)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-mist-400 transition-colors hover:bg-white/6 hover:text-brand-400">
                          Editar
                        </button>
                        <button type="button" onClick={() => cambiarEstado(u)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-mist-400 transition-colors hover:bg-white/6 hover:text-ok-400">
                          {u.estado === 'activo' ? 'Inactivar' : 'Activar'}
                        </button>
                        {u.id_usuario !== usuarioActual.id_usuario && (
                          <button type="button" onClick={() => eliminar(u)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-mist-400 transition-colors hover:bg-danger-500/10 hover:text-danger-400">
                            Eliminar
                          </button>
                        )}
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
            Mostrando {visibles.length} de {usuarios.length} usuarios
          </div>
        )}
      </div>

      {/* Formulario */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={editandoId ? 'Editar usuario' : 'Nuevo usuario'}
        descripcion={
          editandoId
            ? 'El documento y la contraseña no se modifican desde aquí.'
            : 'La contraseña se guarda cifrada con bcrypt en la base de datos.'
        }
      >
        <form onSubmit={enviar}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Input label="Nombres" name="nombres" value={formulario.nombres} onChange={alCambiar} error={errores.nombres} maxLength={50} />
            <Input label="Apellidos" name="apellidos" value={formulario.apellidos} onChange={alCambiar} error={errores.apellidos} maxLength={50} />

            {!editandoId && (
              <>
                <Select label="Tipo de documento" name="tipo_documento" value={formulario.tipo_documento} onChange={alCambiar} error={errores.tipo_documento} options={tiposDocumento} />
                <Input label="Número de documento" name="numero_documento" value={formulario.numero_documento} onChange={alCambiar} error={errores.numero_documento} maxLength={15} />
              </>
            )}

            <Input label="Teléfono" name="telefono" value={formulario.telefono} onChange={alCambiar} error={errores.telefono} maxLength={10} />
            <Input label="Correo electrónico" name="email" type="email" value={formulario.email} onChange={alCambiar} error={errores.email} maxLength={100} />
          </div>

          <Input label="Dirección" name="direccion" value={formulario.direccion} onChange={alCambiar} error={errores.direccion} maxLength={100} />

          <div className="grid gap-x-4 sm:grid-cols-2">
            <Select label="Rol" name="rol_id" value={formulario.rol_id} onChange={alCambiar} options={roles} placeholder="Selecciona un rol" />
            {!editandoId && (
              <Input label="Contraseña" name="password" type="password" value={formulario.password} onChange={alCambiar} error={errores.password} maxLength={20} ayuda="8 a 20 caracteres, con mayúscula, minúscula y número" />
            )}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" ancho="auto" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" ancho="auto" disabled={guardando}>
              {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
