import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import Aviso from '../components/Aviso';
import Logo from '../components/Logo';
import { validateField } from '../utils/validators';
import { api } from '../utils/api';

/** Mide la fortaleza de la contraseña, igual que en el formulario de registro. */
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

/**
 * Segundo paso de la recuperación: se llega desde el enlace del correo.
 *
 * Antes de mostrar el formulario se comprueba con el Backend que el enlace
 * siga vigente, para avisar de inmediato si ya se usó o expiró.
 */
export default function RestablecerPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [estado, setEstado] = useState('verificando'); // verificando | valido | invalido | listo
  const [cuenta, setCuenta] = useState(null);
  const [errorToken, setErrorToken] = useState('');

  const [datos, setDatos] = useState({ password: '', confirmPassword: '' });
  const [errores, setErrores] = useState({});
  const [verClave, setVerClave] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');

  const fuerza = useMemo(() => fuerzaClave(datos.password), [datos.password]);

  // Comprobación del enlace al entrar a la página.
  useEffect(() => {
    let vigente = true;

    api
      .verificarTokenRecuperacion(token)
      .then((respuesta) => {
        if (!vigente) return;
        setCuenta(respuesta);
        setEstado('valido');
      })
      .catch((err) => {
        if (!vigente) return;
        setErrorToken(err.message || 'El enlace no es válido');
        setEstado('invalido');
      });

    return () => {
      vigente = false;
    };
  }, [token]);

  const alCambiar = (evento) => {
    const { name, value } = evento.target;
    const actualizado = { ...datos, [name]: value };
    setDatos(actualizado);
    setErrores((previo) => ({ ...previo, [name]: validateField(name, value, actualizado) }));
  };

  const enviar = async (evento) => {
    evento.preventDefault();

    const nuevos = {
      password: validateField('password', datos.password, datos),
      confirmPassword: validateField('confirmPassword', datos.confirmPassword, datos),
    };
    setErrores(nuevos);
    setErrorServidor('');
    if (nuevos.password || nuevos.confirmPassword) return;

    setEnviando(true);
    try {
      await api.restablecerPassword(token, datos.password);
      setEstado('listo');
      // Se lleva al inicio de sesión tras un momento para que lea el mensaje.
      setTimeout(() => navigate('/login'), 3500);
    } catch (err) {
      if (err.errors?.password) {
        setErrores((previo) => ({ ...previo, password: err.errors.password }));
      }
      setErrorServidor(err.message || 'No fue posible cambiar la contraseña');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="relative overflow-hidden px-5 py-16 sm:px-8">
      <div className="halo -left-20 top-10 h-72 w-72 bg-brand-500/15" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-7 text-center">
          <Logo className="mx-auto h-12 w-12" />
          <h1 className="titulo-seccion mt-4 text-2xl">Nueva contraseña</h1>
        </div>

        <div className="tarjeta animate-escalar p-7 sombra-profunda sm:p-8">
          {/* --- Comprobando el enlace --- */}
          {estado === 'verificando' && (
            <div className="py-8 text-center">
              <div className="esqueleto mx-auto h-12 w-12 rounded-full" />
              <p className="mt-4 text-sm text-mist-500">Comprobando el enlace...</p>
            </div>
          )}

          {/* --- Enlace vencido o ya usado --- */}
          {estado === 'invalido' && (
            <div className="py-4 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-500/12 text-2xl">
                ⚠
              </span>
              <h2 className="titulo-seccion mt-4 text-xl">Enlace no válido</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-mist-500">
                {errorToken}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-mist-600">
                Los enlaces vencen a los 30 minutos y solo pueden usarse una vez. Solicita
                uno nuevo desde el inicio de sesión.
              </p>
              <Link to="/login" className="btn btn-primario mt-6 w-full">
                Volver al inicio de sesión
              </Link>
            </div>
          )}

          {/* --- Contraseña cambiada --- */}
          {estado === 'listo' && (
            <div className="py-4 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok-500/12 text-3xl">
                ✓
              </span>
              <h2 className="titulo-seccion mt-5 text-xl">Contraseña actualizada</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-mist-400">
                Ya puedes iniciar sesión con tu nueva contraseña. Te llevamos allá en un
                momento.
              </p>
              <Link to="/login" className="btn btn-primario mt-6 w-full">
                Iniciar sesión
              </Link>
            </div>
          )}

          {/* --- Formulario --- */}
          {estado === 'valido' && (
            <form onSubmit={enviar}>
              <div className="mb-6">
                <p className="text-sm text-mist-500">Estás cambiando la contraseña de:</p>
                <p className="mt-1 font-semibold text-mist-50">
                  {cuenta.nombres} · <span className="text-brand-400">{cuenta.email}</span>
                </p>
                <p className="mt-2 text-xs text-mist-600">
                  El enlace vence en {cuenta.minutos_restantes} minutos.
                </p>
              </div>

              <Aviso tipo="error" onCerrar={() => setErrorServidor('')}>{errorServidor}</Aviso>

              <div className="relative">
                <Input
                  label="Nueva contraseña"
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

              <Input
                label="Confirmar contraseña"
                name="confirmPassword"
                type="password"
                value={datos.confirmPassword}
                onChange={alCambiar}
                error={errores.confirmPassword}
                maxLength={20}
                placeholder="••••••••"
              />

              <Button type="submit" disabled={enviando}>
                {enviando ? 'Guardando...' : 'Guardar contraseña'}
              </Button>

              <p className="mt-5 text-center text-xs leading-relaxed text-mist-600">
                Entre 8 y 20 caracteres, con mayúscula, minúscula y número.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
