import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Cake, Cookie, Gift, PartyPopper, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductGrid } from "../components/ProductCard";
import { ContactInfo, DeliveryInfo, FAQ } from "../components/StoreInfo";
import { ErrorState, Spinner } from "../components/ui";
import { useCategories, useStore } from "../hooks/useShop";
import { api } from "../services/api";

const CATEGORY_ICON: Record<string, typeof Cake> = {
  cupcakes: Sparkles,
  pasteles: Cake,
  galletas: Cookie,
  "pasteles-personalizados": Star,
  "cajas-de-regalo": Gift,
  "paquetes-para-eventos": PartyPopper,
};

function Section({ id, eyebrow, title, link, children }: { id?: string; eyebrow?: string; title: string; link?: { to: string; label: string }; children: React.ReactNode }) {
  return (
    <section id={id} className="contenedor mt-16 sm:mt-20">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="sobretitulo mb-2">{eyebrow}</p>}
          <h2 className="titulo-seccion">{title}</h2>
        </div>
        {link && (
          <Link to={link.to} className="hidden items-center gap-1 text-sm font-bold text-rosa-600 hover:underline sm:inline-flex">
            {link.label} <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function ProductSection(props: { query: Record<string, string | number>; eyebrow: string; title: string; link?: { to: string; label: string }; hideIfEmpty?: boolean }) {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["products", props.query], queryFn: () => api.products(props.query) });
  if (isLoading) return <Section {...props}><Spinner /></Section>;
  if (isError) return <Section {...props}><ErrorState message="No pudimos cargar los productos." onRetry={refetch} /></Section>;
  if (!data?.items.length && props.hideIfEmpty) return null;
  return <Section {...props}>{data?.items.length ? <ProductGrid products={data.items} /> : <p className="text-sm text-cafe-500">Pronto tendremos novedades aquí.</p>}</Section>;
}

export default function Home() {
  const { data: categories } = useCategories();
  const { data: store } = useStore();
  const visibleCats = categories?.filter((c) => c.productCount > 0) ?? [];

  return (
    <>
      {/* Banner principal */}
      <section className="relative overflow-hidden">
        <div className="contenedor grid items-center gap-8 pt-8 pb-4 md:grid-cols-[1.05fr_1fr] md:pt-14">
          <div className="animate-aparecer">
            <p className="sobretitulo mb-4">Repostería artesanal</p>
            <h1 className="text-[2.6rem] leading-[1.05] sm:text-6xl">
              Un dulce momento <span className="text-rosa-600 italic">comienza</span> con Mafer
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-cafe-500">
              Descubre nuestros pasteles, cupcakes y galletas preparados para convertir cualquier ocasión en un recuerdo especial.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/catalogo" className="btn-primario px-7">Ver catálogo</Link>
              <Link to="/categoria/pasteles-personalizados" className="btn-secundario px-7">Personalizar mi pastel</Link>
            </div>
          </div>
          <div className="relative">
            <img src="/demo/hero.svg" alt="Pastel de dos pisos con flores, cupcake y galletas de Mafer" className="aspect-[9/7.6] w-full rounded-[2rem] object-cover shadow-[var(--shadow-elevada)]" />
            <div className="absolute -bottom-4 left-4 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-elevada)] sm:left-[-1.5rem]">
              <p className="font-display text-lg text-cafe-900 italic">«{store?.slogan ?? "Pequeños antojos, grandes momentos"}»</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      {visibleCats.length > 0 && (
        <Section eyebrow="Explora" title="Categorías" link={{ to: "/catalogo", label: "Ver todo" }}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {visibleCats.map((c) => {
              const Icon = CATEGORY_ICON[c.slug] ?? Sparkles;
              return (
                <Link key={c.id} to={`/categoria/${c.slug}`} className="tarjeta group flex flex-col items-center gap-2 px-3 py-5 text-center transition hover:-translate-y-0.5 hover:bg-rosa-50">
                  <span className="grid size-12 place-items-center rounded-full bg-rosa-100 text-rosa-600 transition group-hover:bg-rosa-600 group-hover:text-white">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-[15px] leading-tight text-cafe-900">{c.name}</span>
                  <span className="text-xs text-cafe-400">{c.productCount} producto{c.productCount === 1 ? "" : "s"}</span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      <ProductSection query={{ bestSellers: "true", sort: "popular", pageSize: 4 }} eyebrow="Los favoritos" title="Más vendidos" hideIfEmpty />
      <ProductSection query={{ featured: "true", pageSize: 8, sort: "popular" }} eyebrow="Selección de la casa" title="Productos destacados" link={{ to: "/catalogo", label: "Ver catálogo" }} />

      {/* Personalizados */}
      <section className="contenedor mt-16 sm:mt-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-cafe-900 px-6 py-12 text-crema-100 sm:px-12">
          <div className="absolute -top-20 -right-16 size-72 rounded-full bg-rosa-600/30 blur-2xl" aria-hidden="true" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="sobretitulo mb-3 text-rosa-200">Hecho para ti</p>
              <h2 className="text-3xl text-crema-50 sm:text-4xl">Pasteles personalizados</h2>
              <p className="mt-4 max-w-lg text-crema-200">
                Elige el sabor del pan, el relleno, la cobertura y la decoración. Cuéntanos la temática y los colores de tu celebración y lo preparamos con todo el cariño.
              </p>
              <Link to="/categoria/pasteles-personalizados" className="btn mt-7 bg-rosa-200 px-7 text-cafe-900 hover:bg-white">Diseñar mi pastel</Link>
            </div>
            <img src="/demo/pastel-personalizado.svg" alt="" className="mx-auto w-full max-w-xs rounded-3xl" />
          </div>
        </div>
      </section>

      <ProductSection query={{ onSale: "true", pageSize: 4 }} eyebrow="Por tiempo limitado" title="Promociones" link={{ to: "/promociones", label: "Ver promociones" }} hideIfEmpty />
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
