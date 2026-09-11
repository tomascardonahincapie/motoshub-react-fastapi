import { Link } from 'react-router-dom';
import { NEGOCIO } from '../config';

const valores = [
  { icono: '🏍️', titulo: 'Pasión', texto: 'Vivimos las motos. Lo que recomendamos es lo que nosotros mismos usaríamos.' },
  { icono: '🤝', titulo: 'Confianza', texto: 'Precios claros, repuestos originales y un diagnóstico honesto antes de cobrar.' },
  { icono: '⚙️', titulo: 'Técnica', texto: 'Mecánicos certificados y herramienta especializada para cada marca.' },
  { icono: '🚀', titulo: 'Cercanía', texto: 'Atención directa por WhatsApp: sin filas y sin esperas innecesarias.' },
];

const hitos = [
  { anio: '2020', titulo: 'Nace MotosHub', texto: 'Abrimos como un taller pequeño de barrio con dos mecánicos.' },
  { anio: '2022', titulo: 'Llega la tienda', texto: 'Sumamos venta de repuestos, cascos y accesorios de marcas reconocidas.' },
  { anio: '2024', titulo: 'Concesionario', texto: 'Empezamos a vender motocicletas nuevas de seis marcas distintas.' },
  { anio: '2026', titulo: 'Plataforma en línea', texto: 'Catálogo digital y agendamiento de servicios desde cualquier dispositivo.' },
];

export default function AboutUs() {
  return (
    <div className="animate-aparecer">
      {/* Portada */}
      <section className="relative overflow-hidden px-5 pb-10 pt-16 sm:px-8">
        <div className="halo left-1/4 top-0 h-72 w-72 bg-brand-500/14" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="etiqueta etiqueta-marca mb-5">Quiénes somos</span>
          <h1 className="titulo-seccion text-3xl leading-tight sm:text-5xl">
            Más que una tienda,
            <br />
            <span className="texto-degradado">un taller de confianza</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-mist-400 sm:text-base">
            Llevamos años acompañando a motociclistas en la compra de su moto y en el
            cuidado que necesita para durar.
          </p>
        </div>
      </section>

      {/* Historia y misión */}
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          <article className="tarjeta animate-subir p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/12 text-xl">📖</span>
            <h2 className="titulo-seccion mt-4 text-xl">Nuestra historia</h2>
            <p className="mt-3 text-sm leading-relaxed text-mist-400">
              MotosHub nació de un grupo de apasionados por las motos que querían un lugar
              donde el cliente recibiera una explicación clara de lo que le hacen a su moto y
              cuánto cuesta, sin sorpresas.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-mist-400">
              De ese taller pequeño pasamos a tener tienda, concesionario y una plataforma
              donde puedes comprar y agendar sin moverte de casa.
            </p>
          </article>

          <article className="tarjeta animate-subir p-6" style={{ animationDelay: '90ms' }}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-400/12 text-xl">🎯</span>
            <h2 className="titulo-seccion mt-4 text-xl">Nuestra misión</h2>
            <p className="mt-3 text-sm leading-relaxed text-mist-400">
              Que cada motociclista tenga acceso a productos confiables y a un
              mantenimiento bien hecho, con asesoría real y precios transparentes.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-mist-400">
              Trabajamos para que elegir tu próxima moto o dejarla en el taller sea una
              decisión informada y tranquila.
            </p>
          </article>
        </div>
      </section>

      {/* Valores */}
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <h2 className="titulo-seccion mb-6 text-center text-2xl sm:text-3xl">
          Lo que nos <span className="texto-degradado">mueve</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {valores.map((valor, i) => (
            <article
              key={valor.titulo}
              className="tarjeta tarjeta-interactiva animate-subir p-5 text-center"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl">
                {valor.icono}
              </span>
              <h3 className="mt-4 font-display text-base font-semibold text-mist-50">{valor.titulo}</h3>
              <p className="mt-2 text-xs leading-relaxed text-mist-500">{valor.texto}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Línea de tiempo */}
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h2 className="titulo-seccion mb-8 text-center text-2xl sm:text-3xl">Nuestro recorrido</h2>

        <ol className="relative space-y-6 border-l border-line pl-8">
          {hitos.map((hito, i) => (
            <li key={hito.anio} className="animate-subir" style={{ animationDelay: `${i * 80}ms` }}>
              {/* Punto sobre la línea */}
              <span className="absolute -left-[7px] mt-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-ink-950 bg-brand-500" />
              <p className="font-display text-sm font-bold tracking-wider text-brand-400">{hito.anio}</p>
              <h3 className="mt-0.5 font-display text-lg font-semibold text-mist-50">{hito.titulo}</h3>
              <p className="mt-1 text-sm leading-relaxed text-mist-500">{hito.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Cierre */}
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <div className="tarjeta relative overflow-hidden px-6 py-12 text-center sm:px-12">
          <div className="halo left-1/2 top-0 h-56 w-56 -translate-x-1/2 bg-brand-500/18" aria-hidden="true" />
          <div className="relative">
            <h2 className="titulo-seccion text-2xl sm:text-3xl">¿Vienes a visitarnos?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mist-400">
              {NEGOCIO.direccion}
              <br />
              {NEGOCIO.horario}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/catalogo" className="btn btn-primario w-full sm:w-auto">
                Ver catálogo
              </Link>
              <Link to="/contact" className="btn btn-secundario w-full sm:w-auto">
                Escribirnos
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
