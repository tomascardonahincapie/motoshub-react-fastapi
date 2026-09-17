import { useState } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import Aviso from '../components/Aviso';
import IconoWhatsApp from '../components/IconoWhatsApp';
import { NEGOCIO, enlaceWhatsApp } from '../config';

const formularioVacio = { nombre: '', email: '', telefono: '', asunto: '', mensaje: '' };

const asuntos = [
  { value: 'compra', label: 'Quiero comprar una moto' },
  { value: 'repuestos', label: 'Repuestos y accesorios' },
  { value: 'taller', label: 'Agendar un servicio de taller' },
  { value: 'otro', label: 'Otra consulta' },
];

const preguntas = [
  {
    pregunta: '¿Hacen entregas a otras ciudades?',
    respuesta: 'Sí. Coordinamos el transporte de la moto hasta tu ciudad con una empresa especializada.',
  },
  {
    pregunta: '¿Necesito cita para el taller?',
    respuesta: 'Es lo recomendable. Puedes agendar por WhatsApp y te confirmamos el horario el mismo día.',
  },
  {
    pregunta: '¿Qué formas de pago manejan?',
    respuesta: 'Efectivo, transferencia, tarjetas débito y crédito, y financiación para motocicletas nuevas.',
  },
];

export default function Contact() {
  const [datos, setDatos] = useState(formularioVacio);
  const [enviado, setEnviado] = useState(false);
  const [abierta, setAbierta] = useState(null);

  const alCambiar = (evento) => {
    const { name, value } = evento.target;
    setDatos((previo) => ({ ...previo, [name]: value }));
  };

  const enviar = (evento) => {
    evento.preventDefault();
    setEnviado(true);
    setDatos(formularioVacio);
    setTimeout(() => setEnviado(false), 5000);
  };

  const tarjetas = [
    { icono: '📍', titulo: 'Ubicación', lineas: [NEGOCIO.direccion] },
    { icono: '✉️', titulo: 'Correo', lineas: [NEGOCIO.correo] },
    { icono: '📞', titulo: 'Teléfono', lineas: [NEGOCIO.telefono] },
    { icono: '🕐', titulo: 'Horario', lineas: NEGOCIO.horario.split(' · ') },
  ];

  return (
    <div className="animate-aparecer">
      {/* Portada */}
      <section className="relative overflow-hidden px-5 pb-8 pt-16 sm:px-8">
        <div className="halo right-1/4 top-0 h-64 w-64 bg-brand-500/12" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="etiqueta etiqueta-marca mb-5">Contacto</span>
          <h1 className="titulo-seccion text-3xl leading-tight sm:text-5xl">
            Hablemos de <span className="texto-degradado">tu moto</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-mist-400 sm:text-base">
            Escríbenos y te respondemos con la disponibilidad, los precios y los tiempos
            reales de entrega.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        {/* Datos de contacto */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tarjetas.map((tarjeta, i) => (
            <article
              key={tarjeta.titulo}
              className="tarjeta tarjeta-interactiva animate-subir p-5"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/12 text-lg">
                {tarjeta.icono}
              </span>
              <h3 className="mt-3.5 font-display text-sm font-semibold uppercase tracking-wider text-mist-50">
                {tarjeta.titulo}
              </h3>
              {tarjeta.lineas.map((linea) => (
                <p key={linea} className="mt-1 text-xs leading-relaxed text-mist-500">{linea}</p>
              ))}
            </article>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* Formulario */}
          <div className="tarjeta animate-subir p-6 sm:p-7">
            <h2 className="titulo-seccion text-xl">Envíanos un mensaje</h2>
            <p className="mt-1 text-sm text-mist-500">Te contestamos en horario laboral.</p>

            {enviado && (
              <div className="mt-5">
                <Aviso tipo="exito">
                  ¡Gracias! Recibimos tu mensaje y te responderemos muy pronto.
                </Aviso>
              </div>
            )}

            <form onSubmit={enviar} className="mt-5">
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Input label="Nombre" name="nombre" value={datos.nombre} onChange={alCambiar} maxLength={60} placeholder="Tu nombre" />
                <Input label="Correo electrónico" name="email" type="email" value={datos.email} onChange={alCambiar} maxLength={100} placeholder="tucorreo@ejemplo.com" />
                <Input label="Teléfono" name="telefono" value={datos.telefono} onChange={alCambiar} maxLength={10} placeholder="3001234567" />

                <div className="mb-4">
                  <label htmlFor="asunto" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
                    Asunto
                  </label>
                  <select id="asunto" name="asunto" value={datos.asunto} onChange={alCambiar} className="campo cursor-pointer">
                    <option value="">Selecciona un asunto</option>
                    {asuntos.map((opcion) => (
                      <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="mensaje" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
                  Mensaje
                </label>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  value={datos.mensaje}
                  onChange={alCambiar}
                  rows={5}
                  maxLength={500}
                  placeholder="Cuéntanos qué necesitas..."
                  className="campo resize-y"
                />
                <p className="mt-1.5 text-right text-[0.7rem] text-mist-600">
                  {datos.mensaje.length}/500 caracteres
                </p>
              </div>

              <Button type="submit">Enviar mensaje</Button>
            </form>
          </div>

          {/* Lateral */}
          <div className="space-y-5">
            <div className="tarjeta animate-subir p-6" style={{ animationDelay: '80ms' }}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ok-500/12 text-ok-400">
                <IconoWhatsApp className="h-6 w-6" />
              </span>
              <h3 className="titulo-seccion mt-4 text-lg">¿Prefieres WhatsApp?</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist-500">
                Es la vía más rápida. Escríbenos y te atendemos al momento durante el
                horario del taller.
              </p>
              <a
                href={enlaceWhatsApp(`Hola ${NEGOCIO.nombre}, quiero hacer una consulta.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp mt-5 w-full"
              >
                <IconoWhatsApp className="h-4 w-4" />
                Abrir WhatsApp
              </a>
            </div>

            {/* Preguntas frecuentes */}
            <div className="tarjeta animate-subir overflow-hidden" style={{ animationDelay: '150ms' }}>
              <h3 className="titulo-seccion border-b border-line px-6 py-4 text-lg">
                Preguntas frecuentes
              </h3>
              <div className="divide-y divide-line">
                {preguntas.map((item, i) => (
                  <div key={item.pregunta}>
                    <button
                      type="button"
                      onClick={() => setAbierta(abierta === i ? null : i)}
                      aria-expanded={abierta === i}
                      className="flex w-full items-center justify-between gap-3 px-6 py-3.5 text-left text-sm font-medium text-mist-200 transition-colors hover:text-mist-50"
                    >
                      {item.pregunta}
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className={`h-4 w-4 shrink-0 text-mist-500 transition-transform duration-300 ${abierta === i ? 'rotate-180' : ''}`}
                      >
                        <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {abierta === i && (
                      <p className="animate-subir px-6 pb-4 text-sm leading-relaxed text-mist-500">
                        {item.respuesta}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
