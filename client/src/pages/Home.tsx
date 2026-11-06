import { useQuery } from "@tanstack/react-query";
import { Flame, Gift, MessageCircle, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ProductGrid } from "../components/ProductCard";
import { ContactInfo, DeliveryInfo, FAQ } from "../components/StoreInfo";
import { ErrorState, ProductImage, Spinner } from "../components/ui";
import { useCategories, useStore } from "../hooks/useShop";
import { asset } from "../lib/asset";
import { SEASONS, useSeason } from "../lib/seasons";
import { whatsappLink } from "../lib/whatsapp";
import { api } from "../services/api";

const PASTEL = ["bg-rosa-100", "bg-celeste", "bg-vainilla", "bg-durazno-100"];
const EVENTOS = ["bautizo", "baby-shower", "bodas", "xv-y-cumpleanos"];

/** Encabezado de sección: título a la izquierda, enlace a la derecha. */
function Section({ id, title, intro, link, band, children }: {
  id?: string; title: string; intro?: string; link?: { to: string; label: string }; band?: boolean; children: ReactNode;
}) {
  const head = (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="max-w-2xl">
        <h2 className="titulo-dulce">{title}</h2>
        {intro && <p className="mt-1.5 text-[15px] text-cafe-500">{intro}</p>}
      </div>
      {link && (
        <Link to={link.to} className="text-sm font-bold text-rosa-600 underline-offset-4 hover:underline">
          {link.label}
        </Link>
      )}
    </div>
  );
  if (band) {
    return (
      <section id={id} className="relative mt-20 bg-durazno-100 py-14 sm:mt-24">
        <div className="contenedor">{head}{children}</div>
      </section>
    );
  }
  return (
    <section id={id} className="contenedor mt-20 sm:mt-24">
      {head}
      {children}
    </section>
  );
}

function ProductSection(props: { query: Record<string, string | number>; title: string; intro?: string; link?: { to: string; label: string }; hideIfEmpty?: boolean; band?: boolean; id?: string }) {
  const { query, hideIfEmpty, ...section } = props;
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["products", query], queryFn: () => api.products(query) });
  if (isLoading) return <Section {...section}><Spinner /></Section>;
  if (isError) return <Section {...section}><ErrorState message="No pudimos cargar los productos." onRetry={refetch} /></Section>;
  if (!data?.items.length && hideIfEmpty) return null;
  return <Section {...section}>{data?.items.length ? <ProductGrid products={data.items} /> : <p className="text-sm text-cafe-500">Pronto tendremos novedades aquí.</p>}</Section>;
}

const PROMESAS = [
  { Icon: Flame, title: "Hechas a mano", text: "Cera de soya y aromas elegidos en pequeños lotes." },
  { Icon: Gift, title: "Personalizadas", text: "Nombres, fecha y colores para los recuerdos de tu evento." },
  { Icon: ShieldCheck, title: "Pago seguro o por WhatsApp", text: "Paga con tarjeta o cotiza tu pedido por mayoreo." },
];

export default function Home() {
  const { data: categories } = useCategories();
  const { data: store } = useStore();
  const season = useSeason();
  const byslug = new Map((categories ?? []).map((c) => [c.slug, c]));
  const eventos = EVENTOS.map((s) => byslug.get(s)).filter((c) => c && c.productCount > 0);
  const seasonal = (Object.values(SEASONS) as (typeof SEASONS)[keyof typeof SEASONS][])
    .filter((s) => s.category && s.id !== season.id)
    .map((s) => byslug.get(s.category!))
    .filter((c) => c && c.productCount > 0);
  const waText = `¡Hola, ${store?.storeName ?? "Mafer"}! Quiero cotizar velas para mi evento.`;

  return (
    <>
      {/* Portada de temporada */}
      <section className="rayas relative overflow-hidden">
        <div className="contenedor grid items-center gap-10 py-12 md:grid-cols-[1.12fr_1fr] md:py-16">
          <div className="order-2 rounded-[2rem] bg-white/95 p-7 text-center shadow-[var(--shadow-suave)] sm:p-10 md:order-1 md:text-left">
            {season.category && <p className="sobretitulo mb-3">Temporada de {season.inline}</p>}
            <h1 className="text-[2.3rem] leading-[1.06] sm:text-[3.1rem]">{season.title}</h1>
            <p className="mt-4 text-[17px] leading-relaxed text-cafe-500">{season.subtitle}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link to={season.category ? `/categoria/${season.category}` : "#eventos"} className="btn-primario px-7">{season.cta}</Link>
              <Link to={season.category ? "#eventos" : "/catalogo"} className="btn-secundario px-7">{season.category ? "Recuerdos para eventos" : "Ver catálogo"}</Link>
            </div>
          </div>
          <div className="order-1 flex flex-col items-center md:order-2">
            <div className="relative w-[min(80vw,26rem)]">
              <div className="aspect-[1/0.92] rounded-[50%] bg-white p-3" style={{ boxShadow: "0 0 0 6px var(--color-white), 0 0 0 8px var(--color-empolvado), var(--shadow-elevada)" }}>
                <div className="relative size-full overflow-hidden rounded-[50%] border-[5px] border-dorado bg-rosa-50">
                  <div className="halo-vela absolute top-[6%] left-1/2 size-[46%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(255_210_122/0.55),transparent_68%)]" aria-hidden="true" />
                  <img src={asset(season.hero)} alt="" className="absolute top-1/2 left-1/2 w-[78%] -translate-x-1/2 -translate-y-[46%] drop-shadow-[0_18px_20px_rgb(0_0_0/0.18)]" />
                </div>
              </div>
            </div>
            <p className="mt-6 rounded-full bg-white/90 px-5 py-2 text-center font-display text-lg text-cafe-700">
              «{store?.slogan ?? "Velas artesanales para cada momento"}»
            </p>
          </div>
        </div>
      </section>

      {/* Lo que distingue a Mafer */}
      <section className="relative border-b border-rosa-100 bg-white">
        <ul className="contenedor grid divide-rosa-100 py-6 sm:grid-cols-3 sm:divide-x">
          {PROMESAS.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3.5 py-3 sm:justify-center sm:px-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-rosa-100 text-rosa-600"><Icon className="size-5" /></span>
              <span>
                <span className="block font-display text-[16px] font-semibold text-cafe-900">{title}</span>
                <span className="block text-sm text-cafe-500">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Colección de la temporada vigente */}
      {season.category && (
        <ProductSection
          query={{ category: season.category, pageSize: 8, sort: "popular" }}
          title={`Colección de ${season.inline}`}
          intro="Para regalar, intercambiar o decorar. Apártalas con tiempo: se producen en lotes pequeños."
          link={{ to: `/categoria/${season.category}`, label: "Ver toda la colección" }}
          hideIfEmpty
        />
      )}

      {/* Recuerdos para eventos */}
      {eventos.length > 0 && (
        <Section id="eventos" title="Recuerdos para tu evento" intro="Velas personalizadas con nombres, fecha y los colores de tu celebración. Se venden por paquete de 10, 25 o 50 piezas.">
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4 sm:gap-x-6">
            {eventos.map((c, i) => (
              <Link key={c!.id} to={`/categoria/${c!.slug}`} className="group flex flex-col items-center text-center">
                <span className={`grid aspect-square w-full max-w-[11rem] place-items-center rounded-full ${PASTEL[i % PASTEL.length]} transition group-hover:shadow-[var(--shadow-suave)]`}>
                  <ProductImage src={c!.imageUrl} alt="" className="w-[78%] transition duration-500 group-hover:scale-105" />
                </span>
                <span className="mt-3 font-display text-[16px] font-semibold text-cafe-900 group-hover:text-rosa-600">{c!.name}</span>
                <span className="text-sm text-cafe-500">{c!.description}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Por pieza o por mayoreo */}
      <section className="contenedor mt-20 sm:mt-24">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[2rem] bg-rosa-100 p-8 sm:p-10">
            <h2 className="titulo-dulce">¿Una vela para regalar?</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-cafe-700">Elige tu vela, agrégala al carrito y paga con tarjeta. Puedes pedir caja de regalo y tarjeta con mensaje.</p>
            <Link to="/catalogo" className="btn-primario mt-6 px-7">Comprar por pieza</Link>
          </div>
          <div className="rounded-[2rem] bg-celeste p-8 sm:p-10">
            <h2 className="titulo-dulce">¿Recuerdos para tu evento?</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-cafe-700">Cuéntanos cuántas piezas, los colores y la fecha. Te mandamos tu cotización y el diseño de la etiqueta por WhatsApp.</p>
            <a href={whatsappLink(store?.whatsapp, waText)} target="_blank" rel="noreferrer noopener" className="btn-cafe mt-6 px-7">
              <MessageCircle className="size-4" /> Cotizar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      <ProductSection query={{ featured: "true", pageSize: 8, sort: "popular" }} title="Favoritas de nuestras clientas" link={{ to: "/catalogo", label: "Ver catálogo" }} />
      <ProductSection query={{ category: "aromaticas", pageSize: 4, sort: "popular" }} title="Aromáticas para todo el año" intro="Ámbar, lavanda, coco y eucalipto en frascos de vidrio reutilizables." link={{ to: "/categoria/aromaticas", label: "Ver aromáticas" }} hideIfEmpty band />
      <ProductSection query={{ category: "velas", pageSize: 4, sort: "popular" }} title="Velas postre" intro="Parecen postre, pero son velas hechas a mano. No son comestibles." link={{ to: "/categoria/velas", label: "Ver todas" }} hideIfEmpty />

      {seasonal.length > 0 && (
        <Section title="Otras temporadas" intro="Aparta con tiempo las velas de tu próxima celebración.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {seasonal.map((c, i) => (
              <Link key={c!.id} to={`/categoria/${c!.slug}`} className={`group flex items-center gap-3 rounded-2xl p-3 ${PASTEL[(i + 1) % PASTEL.length]} hover:shadow-[var(--shadow-suave)]`}>
                <ProductImage src={c!.imageUrl} alt="" className="size-16 shrink-0" />
                <span className="font-display text-[16px] font-semibold text-cafe-900 group-hover:text-rosa-600">{c!.name}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {store && (
        <>
          <Section id="entregas" title="Pedidos y entregas">
            <DeliveryInfo s={store} />
          </Section>
          <section className="contenedor mt-20 grid gap-10 sm:mt-24 lg:grid-cols-[1.4fr_1fr]">
            <div id="preguntas">
              <h2 className="titulo-dulce mb-6">Preguntas frecuentes</h2>
              <FAQ s={store} />
            </div>
            <div id="contacto">
              <h2 className="titulo-dulce mb-6">Contacto</h2>
              <div className="tarjeta p-6">
                <ContactInfo s={store} />
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
