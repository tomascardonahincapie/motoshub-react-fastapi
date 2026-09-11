import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Carousel from '../components/Carousel';
import TarjetaCatalogo from '../components/TarjetaCatalogo';
import { bikesData } from '../data/bikesData';
import { api } from '../utils/api';

const ventajas = [
  {
    icono: '🏍️',
    titulo: 'Motos seleccionadas',
    texto: 'Trabajamos con las marcas más confiables del mercado, revisadas una por una antes de entregarlas.',
  },
  {
    icono: '🔧',
    titulo: 'Taller propio',
    texto: 'Mantenimiento preventivo y correctivo con técnicos certificados y repuestos originales.',
  },
  {
    icono: '🛡️',
    titulo: 'Garantía real',
    texto: 'Todos nuestros productos y servicios cuentan con respaldo y acompañamiento posventa.',
  },
];

const cifras = [
  { valor: '+15', etiqueta: 'Productos en catálogo' },
  { valor: '+8', etiqueta: 'Servicios de taller' },
  { valor: '6', etiqueta: 'Marcas disponibles' },
  { valor: '100%', etiqueta: 'Clientes acompañados' },
];

export default function Home() {
  const [destacados, setDestacados] = useState([]);

  // Muestra en la portada los últimos productos activos del catálogo real.
  useEffect(() => {
    api
      .getProductos()
      .then((datos) =>
        setDestacados(
          (datos.productos || []).filter((item) => item.estado !== 'inactivo').slice(0, 3),
        ),
      )
      .catch(() => setDestacados([]));
  }, []);

  return (
    <div className="animate-aparecer">
      {/* ================= PORTADA ================= */}
      <section className="relative overflow-hidden px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
        <div className="halo -left-24 top-0 h-80 w-80 bg-brand-500/18" aria-hidden="true" />
        <div className="halo right-0 top-32 h-72 w-72 bg-info-400/10" aria-hidden="true" />

        <div className="relative mx-auto max-w-4xl text-center">
          <span className="etiqueta etiqueta-marca mb-6 animate-subir">
            Concesionario y taller especializado
          </span>

          <h1 className="titulo-seccion animate-subir retardo-1 text-4xl leading-[1.05] sm:text-6xl lg:text-7xl">
            Tu próxima moto
            <br />
            <span className="texto-degradado">empieza aquí</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl animate-subir retardo-2 text-base leading-relaxed text-mist-400 sm:text-lg">
            Motocicletas, repuestos y accesorios con asesoría real. Compra en línea y
            agenda el mantenimiento de tu moto sin llamadas ni filas.
          </p>

          <div className="mt-9 flex animate-subir retardo-3 flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/catalogo" className="btn btn-primario w-full sm:w-auto">
              Explorar catálogo
            </Link>
            <Link to="/contact" className="btn btn-secundario w-full sm:w-auto">
              Hablar con un asesor
            </Link>
          </div>
        </div>

        {/* Cifras */}
        <div className="relative mx-auto mt-16 grid max-w-4xl animate-subir retardo-4 grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {cifras.map((cifra) => (
            <div key={cifra.etiqueta} className="superficie px-4 py-5 text-center">
              <p className="font-display text-2xl font-bold text-brand-400 sm:text-3xl">{cifra.valor}</p>
              <p className="mt-1 text-[0.68rem] uppercase leading-tight tracking-wider text-mist-500">
                {cifra.etiqueta}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CARRUSEL ================= */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="etiqueta etiqueta-neutra mb-3">Destacadas</span>
            <h2 className="titulo-seccion text-2xl sm:text-4xl">Motos que marcan la diferencia</h2>
          </div>
          <Link to="/catalogo" className="btn btn-fantasma w-auto">
            Ver todas
          </Link>
        </div>

        <Carousel bikes={bikesData} />
      </section>

      {/* ================= VENTAJAS ================= */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {ventajas.map((ventaja, i) => (
            <article
              key={ventaja.titulo}
              style={{ animationDelay: `${i * 90}ms` }}
              className="tarjeta tarjeta-interactiva animate-subir p-6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/12 text-2xl">
                {ventaja.icono}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-mist-50">{ventaja.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist-500">{ventaja.texto}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ================= NOVEDADES DEL CATÁLOGO ================= */}
      {destacados.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="etiqueta etiqueta-neutra mb-3">Recién llegado</span>
              <h2 className="titulo-seccion text-2xl sm:text-4xl">Novedades en la tienda</h2>
            </div>
            <Link to="/catalogo" className="btn btn-fantasma w-auto">
              Ir al catálogo
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destacados.map((producto, i) => (
              <TarjetaCatalogo
                key={producto.id_producto}
                item={producto}
                tipo="producto"
                className="animate-subir"
                retardo={i * 80}
              />
            ))}
          </div>
        </section>
      )}

      {/* ================= LLAMADA FINAL ================= */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="tarjeta relative overflow-hidden px-6 py-12 text-center sm:px-12">
          <div className="halo left-1/2 top-0 h-64 w-64 -translate-x-1/2 bg-brand-500/20" aria-hidden="true" />
          <div className="relative">
            <h2 className="titulo-seccion text-2xl sm:text-4xl">¿Tu moto necesita mantenimiento?</h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-mist-400 sm:text-base">
              Agenda cualquiera de nuestros servicios de taller directamente por WhatsApp.
              Te confirmamos el horario en minutos.
            </p>
            <Link to="/catalogo" className="btn btn-primario mt-7 w-auto">
              Ver servicios de taller
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
