import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Cake, CakeSlice, Cookie, Croissant, Donut, Flame, Gift, PartyPopper, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductGrid } from "../components/ProductCard";
import { ContactInfo, DeliveryInfo, FAQ } from "../components/StoreInfo";
import { ErrorState, Spinner } from "../components/ui";
import { useCategories, useStore } from "../hooks/useShop";
import { api } from "../services/api";
import { asset } from "../lib/asset";

const CATEGORY_ICON: Record<string, typeof Cake> = {
  cupcakes: Sparkles,
  pasteles: Cake,
  galletas: Cookie,
  "pasteles-personalizados": Star,
  donas: Donut,
  "pan-dulce": Croissant,
  "postres-especiales": CakeSlice,
  velas: Flame,
  "cajas-de-regalo": Gift,
  "paquetes-para-eventos": PartyPopper,
};

const Sparks = ({ flip = false }: { flip?: boolean }) => (
  <span aria-hidden="true" className={`inline-flex items-center gap-1 text-menta ${flip ? "flex-row-reverse" : ""}`}>
    <span className="text-[1.15em]">✶</span><span className="text-[0.6em]">˚</span><span className="text-[0.8em]">✦</span>
  </span>
);

function Section({ id, eyebrow, title, link, band, children }: { id?: string; eyebrow?: string; title: string; link?: { to: string; label: string }; band?: boolean; children: React.ReactNode }) {
  const head = (
    <div className="mb-8 flex flex-col items-center text-center">
      {eyebrow && <p className={`mb-2 text-xs font-extrabold tracking-[0.22em] uppercase ${band ? "text-white/90" : "text-rosa-600"}`}>{eyebrow}</p>}
      <h2 className={`titulo-dulce flex items-center gap-3 ${band ? "text-white" : ""}`}>
        <Sparks /> {title} <Sparks flip />
      </h2>
      {link && (
        <Link to={link.to} className={`mt-3 inline-flex items-center gap-1 text-sm font-bold hover:underline ${band ? "text-white" : "text-rosa-600"}`}>
          {link.label} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
  if (band) {
    return (
      <section id={id} className="mt-16 bg-durazno py-14 sm:mt-20">
        <div className="contenedor">{head}{children}</div>
      </section>
    );
  }
  return (
    <section id={id} className="contenedor mt-16 sm:mt-20">
      {head}
      {children}
    </section>
  );
}

function ProductSection(props: { query: Record<string, string | number>; eyebrow: string; title: string; link?: { to: string; label: string }; hideIfEmpty?: boolean; band?: boolean }) {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["products", props.query], queryFn: () => api.products(props.query) });
  if (isLoading) return <Section {...props}><Spinner /></Section>;
  if (isError) return <Section {...props}><ErrorState message="No pudimos cargar los productos." onRetry={refetch} /></Section>;
  if (!data?.items.length && props.hideIfEmpty) return null;
  return <Section {...props}>{data?.items.length ? <ProductGrid products={data.items} /> : <p className="text-sm text-cafe-500">Pronto tendremos novedades aquí.</p>}</Section>;
}

const PASTEL = ["bg-rosa-100", "bg-celeste", "bg-vainilla", "bg-durazno-100"];

/** Moño decorativo en rosa coral. */
function Bow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 70" className={className} aria-hidden="true">
      <path d="M60 30 C40 6 10 4 8 22 C6 38 36 42 60 32 Z" fill="#f4a3a8" stroke="#e07f86" strokeWidth="2" />
      <path d="M60 30 C80 6 110 4 112 22 C114 38 84 42 60 32 Z" fill="#f4a3a8" stroke="#e07f86" strokeWidth="2" />
      <path d="M56 34 L40 66 L50 62 L56 68 L60 36 Z" fill="#f4a3a8" stroke="#e07f86" strokeWidth="2" strokeLinejoin="round" />
      <path d="M64 34 L80 66 L70 62 L64 68 L60 36 Z" fill="#f4a3a8" stroke="#e07f86" strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="60" cy="31" rx="9" ry="8" fill="#ee8f96" stroke="#e07f86" strokeWidth="2" />
    </svg>
  );
}

export default function Home() {
  const { data: categories } = useCategories();
  const { data: store } = useStore();
  const visibleCats = categories?.filter((c) => c.productCount > 0) ?? [];

  return (
    <>
      {/* Banner principal: rayas azul/vainilla y marco ovalado */}
      <section className="rayas relative overflow-hidden">
        <div className="contenedor grid items-center gap-10 py-10 md:grid-cols-[1.12fr_1fr] md:py-16">
          <div className="order-2 animate-aparecer rounded-[2rem] bg-white/92 p-7 text-center shadow-[var(--shadow-suave)] backdrop-blur-sm sm:p-9 md:order-1 md:text-left">
            <p className="mb-3 text-xs font-extrabold tracking-[0.22em] text-rosa-600 uppercase">Repostería artesanal</p>
            <h1 className="text-[2.3rem] leading-[1.06] sm:text-[3rem]">
              Un dulce momento <span className="text-rosa-600">comienza</span> con Mafer
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-cafe-500">
              Descubre nuestros pasteles, cupcakes y galletas preparados para convertir cualquier ocasión en un recuerdo especial.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link to="/catalogo" className="btn-primario px-7">Ver catálogo</Link>
              <Link to="/categoria/pasteles-personalizados" className="btn-secundario px-7">Personalizar mi pastel</Link>
            </div>
          </div>
          <div className="order-1 flex flex-col items-center md:order-2">
            <div className="relative w-[min(88vw,30rem)]">
              {/* Marco: borde blanco festoneado + aro dorado */}
              <div className="aspect-[1/0.82] rounded-[50%] bg-white p-3 shadow-[var(--shadow-elevada)]" style={{ boxShadow: "0 0 0 6px #fff, 0 0 0 8px var(--color-empolvado), var(--shadow-elevada)" }}>
                <div className="relative size-full overflow-hidden rounded-[50%] border-[6px] border-dorado bg-rosa-50">
                  <img src={asset("/productos/pastel-vintage-azul-cerezas.webp")} alt="Pastel vintage azul con cerezas" className="absolute top-[6%] left-1/2 w-[50%] -translate-x-1/2 drop-shadow-md" />
                  <img src={asset("/productos/cupcake-de-fresa.webp")} alt="" className="absolute bottom-[8%] left-[7%] w-[29%] drop-shadow-md" />
                  <img src={asset("/productos/vela-pastelito-fresas.webp")} alt="" className="absolute right-[6%] bottom-[7%] w-[31%] drop-shadow-md" />
                  <img src={asset("/productos/dona-rosa-chispas.webp")} alt="" className="absolute bottom-[3%] left-1/2 w-[24%] -translate-x-1/2 drop-shadow-md" />
                </div>
              </div>
              <Bow className="absolute -bottom-9 left-1/2 w-28 -translate-x-1/2 drop-shadow" />
            </div>
            <p className="mt-12 rounded-full bg-white/90 px-5 py-2 text-center font-display text-lg text-cafe-700">«{store?.slogan ?? "Pequeños antojos, grandes momentos"}»</p>
          </div>
        </div>
      </section>

      {/* Categorías */}
      {visibleCats.length > 0 && (
        <Section eyebrow="Explora" title="Categorías" link={{ to: "/catalogo", label: "Ver todo" }}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {visibleCats.map((c, i) => {
              const Icon = CATEGORY_ICON[c.slug] ?? Sparkles;
              return (
                <Link key={c.id} to={`/categoria/${c.slug}`} className="tarjeta group flex flex-col items-center gap-2 px-3 py-5 text-center transition hover:-translate-y-0.5 hover:bg-rosa-50">
                  <span className={`grid size-12 place-items-center rounded-full text-rosa-600 transition group-hover:bg-rosa-600 group-hover:text-white ${PASTEL[i % PASTEL.length]}`}>
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-[15px] leading-tight font-medium text-cafe-900">{c.name}</span>
                  <span className="text-xs text-cafe-400">{c.productCount} producto{c.productCount === 1 ? "" : "s"}</span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      <ProductSection query={{ bestSellers: "true", sort: "popular", pageSize: 4 }} eyebrow="Los favoritos" title="Más vendidos" hideIfEmpty />
      <ProductSection query={{ featured: "true", pageSize: 8, sort: "popular" }} eyebrow="Selección de la casa" title="Favoritos de la casa" link={{ to: "/catalogo", label: "Ver catálogo" }} />

      {/* Personalizados */}
      <section className="contenedor mt-16 sm:mt-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-celeste px-6 py-12 sm:px-12">
          <div className="absolute -top-16 -right-10 size-64 rounded-full bg-white/50 blur-2xl" aria-hidden="true" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="sobretitulo mb-3">Hecho para ti</p>
              <h2 className="text-3xl sm:text-4xl">Pasteles personalizados</h2>
              <p className="mt-4 max-w-lg text-cafe-700">
                Elige el sabor del pan, el relleno, la cobertura y la decoración. Cuéntanos la temática y los colores de tu celebración y lo preparamos con todo el cariño.
              </p>
              <Link to="/categoria/pasteles-personalizados" className="btn-primario mt-7 px-7">Diseñar mi pastel</Link>
            </div>
            <img src={asset("/productos/pastel-corazon-moras-azules.webp")} alt="" className="mx-auto w-full max-w-xs drop-shadow-xl" />
          </div>
        </div>
      </section>

      <ProductSection query={{ onSale: "true", pageSize: 4 }} eyebrow="Por tiempo limitado" title="Promociones" link={{ to: "/promociones", label: "Ver promociones" }} hideIfEmpty />
      <ProductSection query={{ category: "velas", pageSize: 4, sort: "popular" }} eyebrow="Para regalar o decorar" title="Velas que parecen postre" link={{ to: "/categoria/velas", label: "Ver todas las velas" }} hideIfEmpty band />
      <ProductSection query={{ sort: "newest", pageSize: 4 }} eyebrow="Recién salidos del horno" title="Novedades" />

      {store && (
        <>
          <Section id="entregas" eyebrow="Así funciona" title="Pedidos y entregas">
            <DeliveryInfo s={store} />
          </Section>
          <section className="contenedor mt-16 grid gap-10 sm:mt-20 lg:grid-cols-[1.4fr_1fr]">
            <div id="preguntas">
              <p className="sobretitulo mb-2">Resolvemos tus dudas</p>
              <h2 className="titulo-seccion mb-6">Preguntas frecuentes</h2>
              <FAQ s={store} />
            </div>
            <div id="contacto">
              <p className="sobretitulo mb-2">Estamos para ayudarte</p>
              <h2 className="titulo-seccion mb-6">Contacto</h2>
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
