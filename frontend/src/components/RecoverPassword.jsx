import { useState } from 'react';
import Input from './Input';
import Button from './Button';
import Aviso from './Aviso';
import { validateField } from '../utils/validators';

export default function RecoverPassword({ onBack }) {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);

  const alCambiar = (evento) => {
    setCorreo(evento.target.value);
    setEnviado(false);
    setError(validateField('email', evento.target.value));
  };

  const enviar = (evento) => {
    evento.preventDefault();
    const problema = validateField('email', correo);
    setError(problema);
    if (!problema) setEnviado(true);
  };

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
          Escribe tu correo y te enviaremos las instrucciones para restablecerla.
        </p>
      </div>

      {enviado && (
        <Aviso tipo="exito">
          Si el correo está registrado, recibirás un enlace de recuperación en unos minutos.
        </Aviso>
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

      <Button type="submit">Enviar instrucciones</Button>

      <p className="mt-5 text-center text-xs leading-relaxed text-mist-600">
        El envío del correo se implementará en una fase posterior del proyecto.
      </p>
    </form>
  );
}
