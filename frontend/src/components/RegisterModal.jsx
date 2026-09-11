import { useMemo, useState } from 'react';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import Modal from './Modal';
import Aviso from './Aviso';
import { validateField } from '../utils/validators';
import { api } from '../utils/api';

const formularioVacio = {
  nombres: '',
  apellidos: '',
  tipo_documento: '',
  numero_documento: '',
  direccion: '',
  telefono: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const tiposDocumento = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PA', label: 'Pasaporte' },
];

/** Mide la fortaleza de la contraseña para dar una señal visual al usuario. */
function fuerzaClave(clave) {
  if (!clave) return { nivel: 0, texto: '', color: '' };
  let puntos = 0;
  if (clave.length >= 8) puntos += 1;
  if (/[a-z]/.test(clave) && /[A-Z]/.test(clave)) puntos += 1;
  if (/[0-9]/.test(clave)) puntos += 1;
  if (/[^A-Za-z0-9]/.test(clave) || clave.length >= 12) puntos += 1;

  const escala = [
    { nivel: 1, texto: 'Muy débil', color: 'bg-danger-500' },
    { nivel: 2, texto: 'Débil', color: 'bg-warn-400' },
    { nivel: 3, texto: 'Aceptable', color: 'bg-brand-500' },
    { nivel: 4, texto: 'Fuerte', color: 'bg-ok-500' },
  ];
  return escala[Math.max(puntos - 1, 0)];
}

export default function RegisterModal({ onClose }) {
  const [datos, setDatos] = useState(formularioVacio);
  const [errores, setErrores] = useState({});
  const [registrado, setRegistrado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');

  const fuerza = useMemo(() => fuerzaClave(datos.password), [datos.password]);

  const alCambiar = (evento) => {
    const { name, value } = evento.target;
    const actualizado = { ...datos, [name]: value };
    setDatos(actualizado);
    setErrores((previo) => ({ ...previo, [name]: validateField(name, value, actualizado) }));
  };

  const formularioValido = () =>
    Object.keys(datos).every((campo) => !validateField(campo, datos[campo], datos));

  const enviar = async (evento) => {
    evento.preventDefault();

    const nuevos = {};
    Object.keys(datos).forEach((campo) => {
      nuevos[campo] = validateField(campo, datos[campo], datos);
    });
    setErrores(nuevos);
    setErrorServidor('');
    if (!Object.values(nuevos).every((error) => !error)) return;

    setEnviando(true);
    try {
      // El Backend vuelve a validar, genera el hash y guarda en la base de datos.
      await api.register({
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        tipo_documento: datos.tipo_documento,
        numero_documento: datos.numero_documento,
        direccion: datos.direccion,
        telefono: datos.telefono,
        email: datos.email,
        password: datos.password,
      });
      setRegistrado(true);
    } catch (err) {
      if (err.errors && Object.keys(err.errors).length > 0) {
        setErrores((previo) => ({ ...previo, ...err.errors }));
      }
      setErrorServidor(err.message || 'No fue posible completar el registro');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      abierto
      onCerrar={onClose}
      titulo={registrado ? 'Cuenta creada' : 'Crear cuenta'}
      descripcion={registrado ? undefined : 'Regístrate como cliente para comprar y agendar servicios'}
    >
      {registrado ? (
        <div className="py-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok-500/12 text-3xl">
            ✓
          </span>
          <h3 className="titulo-seccion mt-5 text-xl">¡Registro exitoso!</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-mist-400">
            Tu cuenta quedó creada. Ya puedes iniciar sesión con tu correo y la
            contraseña que elegiste.
          </p>
          <Button onClick={onClose} className="mt-7">
            Ir a iniciar sesión
          </Button>
        </div>
      ) : (
        <form onSubmit={enviar}>
          <Aviso tipo="error" onCerrar={() => setErrorServidor('')}>{errorServidor}</Aviso>

          <p className="mb-4 text-[0.7rem] font-bold uppercase tracking-wider text-mist-600">
            Datos personales
          </p>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Input label="Nombres" name="nombres" value={datos.nombres} onChange={alCambiar} error={errores.nombres} maxLength={50} />
            <Input label="Apellidos" name="apellidos" value={datos.apellidos} onChange={alCambiar} error={errores.apellidos} maxLength={50} />
            <Select label="Tipo de documento" name="tipo_documento" value={datos.tipo_documento} onChange={alCambiar} error={errores.tipo_documento} options={tiposDocumento} />
            <Input label="Número de documento" name="numero_documento" value={datos.numero_documento} onChange={alCambiar} error={errores.numero_documento} maxLength={15} />
          </div>

          <p className="mb-4 mt-2 text-[0.7rem] font-bold uppercase tracking-wider text-mist-600">
            Contacto
          </p>
          <Input label="Dirección" name="direccion" value={datos.direccion} onChange={alCambiar} error={errores.direccion} maxLength={100} />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Input label="Teléfono" name="telefono" value={datos.telefono} onChange={alCambiar} error={errores.telefono} maxLength={10} />
            <Input label="Correo electrónico" name="email" type="email" value={datos.email} onChange={alCambiar} error={errores.email} maxLength={100} />
          </div>

          <p className="mb-4 mt-2 text-[0.7rem] font-bold uppercase tracking-wider text-mist-600">
            Seguridad
          </p>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <div>
              <Input label="Contraseña" name="password" type="password" value={datos.password} onChange={alCambiar} error={errores.password} maxLength={20} />
              {datos.password && !errores.password && (
                <div className="-mt-2 mb-4">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((paso) => (
                      <span
                        key={paso}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          paso <= fuerza.nivel ? fuerza.color : 'bg-ink-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-[0.7rem] text-mist-500">Seguridad: {fuerza.texto}</p>
                </div>
              )}
            </div>
            <Input label="Confirmar contraseña" name="confirmPassword" type="password" value={datos.confirmPassword} onChange={alCambiar} error={errores.confirmPassword} maxLength={20} />
          </div>

          <div className="mt-3 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" ancho="auto" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" ancho="auto" disabled={!formularioValido() || enviando}>
              {enviando ? 'Registrando...' : 'Crear mi cuenta'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
