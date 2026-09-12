import { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from './Input';
import Button from './Button';
import Aviso from './Aviso';
import { validateField } from '../utils/validators';
import { api } from '../utils/api';

/**
 * Primer paso de la recuperación de contraseña: el usuario escribe su correo
 * y el Backend genera un enlace de un solo uso con vigencia limitada.
 *
 * La respuesta es siempre la misma exista o no el correo, para no revelar qué
 * direcciones están registradas.
 */
export default function RecoverPassword({ onBack }) {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');
  // En desarrollo el Backend devuelve el enlace para poder probar sin correo.
  const [enlace, setEnlace] = useState(null);

  const alCambiar = (evento) => {
    setCorreo(evento.target.value);
    setEnviado(false);
    setError(validateField('email', evento.target.value));
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    const problema = validateField('email', correo);
    setError(problema);
    setErrorServidor('');
    if (problema) return;

    setEnviando(true);
    try {
      const respuesta = await api.recuperarPassword(correo);
      setEnviado(true);
      setEnlace(respuesta.enlace || null);
    } catch (err) {
      setErrorServidor(err.message || 'No fue posible procesar la solicitud');
    } finally {
      setEnviando(false);
    }
  };

  // Del enlace absoluto sacamos la ruta interna, para navegar sin recargar.
  const rutaInterna = enlace ? enlace.slice(enlace.indexOf('/restablecer/')) : null;

  return (
    <form onSubmit={enviar}>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mist-500 transition-colors hover:text-brand-400"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
          <path d="M12 4 6 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Volver
      </button>

      <div className="mb-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/12 text-2xl">
          🔑
        </span>
        <h2 className="titulo-seccion mt-4 text-2xl">Recuperar contraseña</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-mist-500">
          Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.
        </p>
      </div>

      <Aviso tipo="error" onCerrar={() => setErrorServidor('')}>{errorServidor}</Aviso>

      {enviado && (
        <Aviso tipo="exito">
          Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.
          El enlace vence en 30 minutos y solo puede usarse una vez.
        </Aviso>
      )}

      {/* Atajo de desarrollo: sin servidor de correo, el enlace llega por aquí */}
      {rutaInterna && (
        <div className="mb-5 rounded-xl border border-brand-500/30 bg-brand-500/8 p-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-wider text-brand-400">
            Modo desarrollo
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-mist-400">
            El proyecto aún no tiene servidor de correo configurado, así que el enlace se
            muestra aquí y también queda registrado en la consola del Backend.
          </p>
          <Link to={rutaInterna} className="btn btn-primario mt-3 w-full !text-[0.7rem]">
            Abrir el enlace de recuperación
          </Link>
        </div>
      )}

      <Input
        label="Correo electrónico"
        name="email"
        type="email"
        value={correo}
        onChange={alCambiar}
        error={error}
        maxLength={100}
        placeholder="tucorreo@ejemplo.com"
      />

      <Button type="submit" disabled={enviando}>
        {enviando ? 'Enviando...' : 'Enviar enlace'}
      </Button>
    </form>
  );
}
