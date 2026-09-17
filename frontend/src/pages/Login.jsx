import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import Aviso from '../components/Aviso';
import Logo from '../components/Logo';
import RegisterModal from '../components/RegisterModal';
import RecoverPassword from '../components/RecoverPassword';
import { RUTA_POR_ROL } from '../components/MenuUsuario';
import { validateField } from '../utils/validators';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ventajas = [
  'Compra tu moto en línea, sin filas',
  'Agenda servicios del taller por WhatsApp',
  'Consulta el estado de tu cuenta cuando quieras',
];

export default function Login() {
  const [datos, setDatos] = useState({ email: '', password: '' });
  const [errores, setErrores] = useState({});
  const [recordarme, setRecordarme] = useState(false);
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [verClave, setVerClave] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  // Si la sesión caducó mientras navegaba, se lo explicamos al volver aquí.
  useEffect(() => {
    if (sessionStorage.getItem('motoshub_session_expired')) {
      sessionStorage.removeItem('motoshub_session_expired');
      setErrorServidor('Tu sesión expiró o dejó de ser válida. Inicia sesión nuevamente.');
    }
  }, []);

  const alCambiar = (evento) => {
    const { name, value } = evento.target;
    setDatos((previo) => ({ ...previo, [name]: value }));
    setErrores((previo) => ({ ...previo, [name]: validateField(name, value) }));
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    const nuevos = {
      email: validateField('email', datos.email),
      password: validateField('password', datos.password),
    };
    setErrores(nuevos);
    setErrorServidor('');
    if (nuevos.email || nuevos.password) return;

    setEnviando(true);
    try {
      // El Backend verifica el hash de la contraseña y devuelve el JWT.
      const respuesta = await api.login(datos);
      login(respuesta);

      // El administrador entra primero al sitio público; desde su avatar
      // puede abrir el panel. Empleado y cliente van directo al suyo.
      const rol = respuesta.usuario.nombre_rol;
      navigate(rol === 'Administrador' ? '/' : RUTA_POR_ROL[rol] || '/');
    } catch (err) {
      setErrorServidor(err.message || 'No fue posible iniciar sesión');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="relative overflow-hidden px-5 py-14 sm:px-8">
      <div className="halo -left-20 top-10 h-72 w-72 bg-brand-500/15" aria-hidden="true" />
      <div className="halo -right-16 bottom-0 h-72 w-72 bg-info-400/10" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
        {/* Columna informativa */}
        <div className="hidden animate-subir lg:block">
          <Logo className="h-14 w-14" />
          <h1 className="titulo-seccion mt-6 text-4xl leading-tight">
            Bienvenido de vuelta a <span className="texto-degradado">MotosHub</span>
          </h1>
          <p className="mt-4 max-w-md leading-relaxed text-mist-400">
            Entra con tu cuenta para acceder a tu panel y gestionar tus compras y
            servicios de taller.
          </p>

          <ul className="mt-8 space-y-3">
            {ventajas.map((ventaja) => (
              <li key={ventaja} className="flex items-start gap-3 text-sm text-mist-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-[0.65rem] font-bold text-brand-400">
                  ✓
                </span>
                {ventaja}
              </li>
            ))}
          </ul>
        </div>

        {/* Tarjeta del formulario */}
        <div className="tarjeta animate-escalar mx-auto w-full max-w-md p-7 sombra-profunda sm:p-8">
          {mostrarRecuperar ? (
            <RecoverPassword onBack={() => setMostrarRecuperar(false)} />
          ) : (
            <>
              <div className="mb-7 text-center lg:text-left">
                <h2 className="titulo-seccion text-2xl">Iniciar sesión</h2>
                <p className="mt-1 text-sm text-mist-500">Accede con tu correo y contraseña</p>
              </div>

              <Aviso tipo="error" onCerrar={() => setErrorServidor('')}>{errorServidor}</Aviso>

              <form onSubmit={enviar}>
                <Input
                  label="Correo electrónico"
                  name="email"
                  type="email"
                  value={datos.email}
                  onChange={alCambiar}
                  error={errores.email}
                  maxLength={100}
                  placeholder="tucorreo@ejemplo.com"
                />

                <div className="relative">
                  <Input
                    label="Contraseña"
                    name="password"
                    type={verClave ? 'text' : 'password'}
                    value={datos.password}
                    onChange={alCambiar}
                    error={errores.password}
                    maxLength={20}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setVerClave((previo) => !previo)}
                    aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-[2.15rem] text-mist-500 transition-colors hover:text-mist-200"
                  >
                    {verClave ? (
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                        <path d="M3 3l14 14M8.2 8.3A2.5 2.5 0 0 0 10 12.5c.7 0 1.3-.3 1.8-.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M6.2 6.3C4.4 7.4 3 9 2.5 10c1.2 2.5 4.1 5 7.5 5 1.3 0 2.5-.4 3.6-1M11.5 5.2A7.6 7.6 0 0 1 17.5 10c-.3.6-.8 1.4-1.5 2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                        <path d="M2.5 10S5.4 5 10 5s7.5 5 7.5 5-2.9 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                        <circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-mist-400">
                    <input
                      type="checkbox"
                      checked={recordarme}
                      onChange={(e) => setRecordarme(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-brand-500"
                    />
                    No cerrar sesión
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarRecuperar(true)}
                    className="text-brand-400 transition-colors hover:text-brand-300"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <Button type="submit" disabled={enviando}>
                  {enviando ? 'Ingresando...' : 'Iniciar sesión'}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-mist-500">
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setMostrarRegistro(true)}
                  className="font-semibold text-brand-400 transition-colors hover:text-brand-300"
                >
                  Crear cuenta
                </button>
              </p>

              <p className="mt-5 border-t border-line pt-5 text-center text-xs text-mist-600">
                ¿Solo quieres mirar?{' '}
                <Link to="/catalogo" className="text-mist-400 underline-offset-2 hover:text-brand-400 hover:underline">
                  Ver el catálogo
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      {mostrarRegistro && <RegisterModal onClose={() => setMostrarRegistro(false)} />}
    </section>
  );
}
