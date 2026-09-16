import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { NEGOCIO } from '../config';

const CLAVE_CONVERSACION = 'motoshub_chat';

const BIENVENIDA = {
  rol: 'asistente',
  contenido:
    `¡Hola! Soy el asistente virtual de ${NEGOCIO.nombre}. ` +
    'Puedo contarte sobre nuestras motos y accesorios, los servicios del taller, ' +
    'cómo comprar desde la página o cómo radicar una PQR. ¿En qué te ayudo?',
};

const SUGERENCIAS_INICIALES = [
  '¿Qué motos tienen disponibles?',
  '¿Qué servicios ofrece el taller?',
  '¿Cómo compro desde la página?',
  'Quiero radicar una PQR',
];

function IconoChat({ abierto }) {
  return abierto ? (
    <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6">
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-2.9-.4L4 21l1.6-3.9A8.2 8.2 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12 3.5a8.4 8.4 0 0 1 9 8Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
      />
      <circle cx="8.4" cy="11.5" r="1.05" fill="currentColor" />
      <circle cx="12" cy="11.5" r="1.05" fill="currentColor" />
      <circle cx="15.6" cy="11.5" r="1.05" fill="currentColor" />
    </svg>
  );
}

function Escribiendo() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-ink-800 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-mist-500 animate-rebotar"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  );
}

function Burbuja({ mensaje }) {
  const esUsuario = mensaje.rol === 'usuario';

  return (
    <div className={`flex ${esUsuario ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[0.82rem] leading-relaxed animate-subir ${
          esUsuario
            ? 'rounded-br-md bg-brand-500 text-white'
            : 'rounded-bl-md border border-line bg-ink-800 text-mist-200'
        }`}
      >
        {mensaje.contenido}
      </div>
    </div>
  );
}

/**
 * Chatbot de atención al cliente.
 *
 * Habla con POST /api/chatbot/mensaje, que es quien llama al servicio de
 * Inteligencia Artificial. La API Key vive en el Backend: el navegador nunca
 * la ve, ni siquiera sabe cuál es el proveedor hasta que se lo pregunta.
 *
 * Funciona sin iniciar sesión; si hay sesión, el asistente saluda por el
 * nombre y la conversación queda asociada al usuario.
 */
export default function Chatbot() {
  const { token, usuario } = useAuth();

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([BIENVENIDA]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sugerencias, setSugerencias] = useState(SUGERENCIAS_INICIALES);
  const [estadoIa, setEstadoIa] = useState(null);
  const [noLeidos, setNoLeidos] = useState(0);

  const finDeLista = useRef(null);
  const campo = useRef(null);
  const conversacion = useRef(
    Number(sessionStorage.getItem(CLAVE_CONVERSACION)) || null,
  );

  // El estado de la IA se consulta una sola vez, al montar el componente.
  useEffect(() => {
    api.getEstadoChatbot().then(setEstadoIa).catch(() => setEstadoIa(null));
  }, []);

  useEffect(() => {
    if (abierto) {
      finDeLista.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setNoLeidos(0);
    }
  }, [mensajes, abierto]);

  const enviar = useCallback(
    async (contenido) => {
      const limpio = contenido.trim();
      if (!limpio || enviando) return;

      setMensajes((previos) => [...previos, { rol: 'usuario', contenido: limpio }]);
      setTexto('');
      setSugerencias([]);
      setEnviando(true);

      try {
        const respuesta = await api.enviarMensajeChat(
          { mensaje: limpio, conversacion_id: conversacion.current },
          token,
        );

        conversacion.current = respuesta.conversacion_id;
        sessionStorage.setItem(CLAVE_CONVERSACION, String(respuesta.conversacion_id));

        setMensajes((previos) => [
          ...previos,
          { rol: 'asistente', contenido: respuesta.respuesta, origen: respuesta.origen },
        ]);
        setSugerencias(respuesta.sugerencias || []);
        if (!abierto) setNoLeidos((previos) => previos + 1);
      } catch (error) {
        setMensajes((previos) => [
          ...previos,
          {
            rol: 'asistente',
            contenido: `${error.message} Mientras tanto puedes escribirnos por WhatsApp.`,
          },
        ]);
      } finally {
        setEnviando(false);
        campo.current?.focus();
      }
    },
    [enviando, token, abierto],
  );

  // Si el usuario cierra la sesión, la conversación anterior deja de ser suya.
  useEffect(() => {
    if (!token && conversacion.current) {
      sessionStorage.removeItem(CLAVE_CONVERSACION);
      conversacion.current = null;
    }
  }, [token]);

  const conIa = estadoIa?.ia_activa;

  return (
    <>
      {/* --- Panel ----------------------------------------------------------
          Arranca en bottom-44 para dejar libre el botón flotante, que mide
          3.5rem y está a 6rem del borde inferior. ------------------------- */}
      {abierto && (
        <div className="fixed bottom-44 right-4 z-50 flex max-h-[min(32rem,calc(100vh-14rem))] w-[calc(100vw-2rem)] max-w-[23rem] animate-escalar flex-col overflow-hidden rounded-2xl border border-line-strong bg-ink-900 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.95)] sm:right-6">
          {/* Cabecera */}
          <header className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-brand-600/22 to-transparent px-4 py-3.5">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg text-white">
              🤖
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-ok-500" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold text-mist-50">
                Asistente {NEGOCIO.nombre}
              </p>
              <p className="truncate text-[0.68rem] text-mist-500">
                {conIa
                  ? `En línea · IA (${estadoIa.modelo})`
                  : 'En línea · respuestas automáticas'}
              </p>
            </div>

            {conIa && (
              <span className="etiqueta etiqueta-marca shrink-0 !text-[0.58rem]">IA</span>
            )}

            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar el chat"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mist-400 transition-colors hover:bg-white/5 hover:text-mist-50"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          {/* Conversación */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {mensajes.map((mensaje, indice) => (
              <Burbuja key={indice} mensaje={mensaje} />
            ))}
            {enviando && <Escribiendo />}
            <div ref={finDeLista} />
          </div>

          {/* Sugerencias */}
          {sugerencias.length > 0 && !enviando && (
            <div className="flex flex-wrap gap-1.5 border-t border-line-soft px-4 pt-3">
              {sugerencias.map((sugerencia) => (
                <button
                  key={sugerencia}
                  type="button"
                  onClick={() => enviar(sugerencia)}
                  className="rounded-full border border-line px-3 py-1.5 text-[0.7rem] text-mist-400 transition-colors hover:border-brand-500/50 hover:text-brand-400"
                >
                  {sugerencia}
                </button>
              ))}
            </div>
          )}

          {/* Escritura */}
          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              enviar(texto);
            }}
            className="flex items-center gap-2 border-t border-line p-3"
          >
            <input
              ref={campo}
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              maxLength={1000}
              placeholder={usuario ? `Escribe aquí, ${usuario.nombres}...` : 'Escribe tu pregunta...'}
              aria-label="Mensaje para el asistente"
              className="campo !mb-0 h-10 flex-1 !py-0 !text-[0.82rem]"
            />
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              aria-label="Enviar mensaje"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition-all hover:bg-brand-600 disabled:opacity-35"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="M3 10 17 3l-4 14-3.2-5.4L3 10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* --- Botón flotante ------------------------------------------------ */}
      <button
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-label={abierto ? 'Cerrar el asistente' : 'Abrir el asistente virtual'}
        aria-expanded={abierto}
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-[0_12px_34px_-10px_rgba(255,92,26,0.8)] transition-transform duration-300 hover:scale-105 active:scale-95"
      >
        {!abierto && (
          <span className="absolute inset-0 -z-10 animate-latido rounded-full bg-brand-500/40" aria-hidden="true" />
        )}
        <IconoChat abierto={abierto} />

        {noLeidos > 0 && !abierto && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger-500 text-[0.62rem] font-bold text-white">
            {noLeidos}
          </span>
        )}
      </button>
    </>
  );
}
