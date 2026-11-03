import { useQuery } from "@tanstack/react-query";
import { CalendarHeart, HandHeart, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ProductGrid } from "../components/ProductCard";
import { ContactInfo, DeliveryInfo, FAQ } from "../components/StoreInfo";
import { ErrorState, ProductImage, Spinner } from "../components/ui";
import { useCategories, useStore } from "../hooks/useShop";
import { asset } from "../lib/asset";
import { api } from "../services/api";

const PASTEL = ["bg-rosa-100", "bg-celeste", "bg-vainilla", "bg-durazno-100"];

/** Moño decorativo en rosa coral, al pie del marco ovalado. */
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

/** Encabezado de sección: título a la izquierda, enlace a la derecha. */
function Section({ id, title, intro, link, band, children }: {
  id?: string; title: string; intro?: string; link?: { to: string; label: string }; band?: boolean; children: ReactNode;
}) {
  const head = (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="max-w-2xl">
        <h2 className={`titulo-dulce ${band ? "text-white" : ""}`}>{title}</h2>
        {intro && <p className={`mt-1.5 text-[15px] ${band ? "text-white/90" : "text-cafe-500"}`}>{intro}</p>}
      </div>
      {link && (
        <Link to={link.to} className={`text-sm font-bold underline-offset-4 hover:underline ${band ? "text-white" : "text-rosa-600"}`}>
          {link.label}
        </Link>
      )}
    </div>
  );
  if (band) {
    return (
      <section id={id} className="mt-20 bg-durazno py-14 sm:mt-24">
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

function ProductSection(props: { query: Record<string, string | number>; title: string; intro?: string; link?: { to: string; label: string }; hideIfEmpty?: boolean; band?: boolean }) {
  const { query, hideIfEmpty, ...section } = props;
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["products", query], queryFn: () => api.products(query) });
  if (isLoading) return <Section {...section}><Spinner /></Section>;
  if (isError) return <Section {...section}><ErrorState message="No pudimos cargar los productos." onRetry={refetch} /></Section>;
  if (!data?.items.length && hideIfEmpty) return null;
  return <Section {...section}>{data?.items.length ? <ProductGrid products={data.items} /> : <p className="text-sm text-cafe-500">Pronto tendremos novedades aquí.</p>}</Section>;
}

const PROMESAS = [
  { Icon: HandHeart, title: "Hecho a mano", text: "Horneamos y decoramos en pequeños lotes." },
  { Icon: CalendarHeart, title: "Tú eliges el día", text: "Reserva fecha y horario al hacer tu pedido." },
  { Icon: ShieldCheck, title: "Pago seguro", text: "Pagas con tarjeta a través de Stripe." },
];

export default function Home() {
  const { data: categories } = useCategories();
  const { data: store } = useStore();
  const visibleCats = categories?.filter((c) => c.productCount > 0) ?? [];

  return (
    <>
      {/* Portada: rayas azul/vainilla y pastel enmarcado */}
      <section className="rayas relative overflow-hidden">
        <div className="contenedor grid items-center gap-10 py-12 md:grid-cols-[1.12fr_1fr] md:py-16">
          <div className="order-2 rounded-[2rem] bg-white/95 p-7 text-center shadow-[var(--shadow-suave)] sm:p-10 md:order-1 md:text-left">
            <h1 className="text-[2.3rem] leading-[1.06] sm:text-[3.1rem]">Un dulce momento comienza con Mafer</h1>
            <p className="mt-4 text-[17px] leading-relaxed text-cafe-500">
              Descubre nuestros pasteles, cupcakes y galletas preparados para convertir cualquier ocasión en un recuerdo especial.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link to="/catalogo" className="btn-primario px-7">Ver catálogo</Link>
              <Link to="/categoria/pasteles-personalizados" className="btn-secundario px-7">Personalizar mi pastel</Link>
            </div>
          </div>
          <div className="order-1 flex flex-col items-center md:order-2">
            <div className="relative w-[min(86vw,29rem)]">
              <div
                className="aspect-[1/0.84] rounded-[50%] bg-white p-3"
                style={{ boxShadow: "0 0 0 6px #fff, 0 0 0 8px var(--color-empolvado), var(--shadow-elevada)" }}
              >
                <div className="relative size-full overflow-hidden rounded-[50%] border-[6px] border-dorado bg-rosa-50">
                  <img
                    src={asset("/productos/pastel-vintage-azul-cerezas.webp")}
                    alt="Pastel vintage azul con olanes blancos y cerezas"
                    className="absolute top-1/2 left-1/2 w-[72%] -translate-x-1/2 -translate-y-[47%] drop-shadow-[0_18px_20px_rgb(122_77_58/0.25)]"
                  />
                </div>
              </div>
              <Bow className="absolute -bottom-9 left-1/2 w-28 -translate-x-1/2" />
            </div>
            <p className="mt-12 rounded-full bg-white/90 px-5 py-2 text-center font-display text-lg text-cafe-700">
              «{store?.slogan ?? "Pequeños antojos, grandes momentos"}»
            </p>
          </div>
        </div>
      </section>

      {/* Lo que distingue a Mafer */}
      <section className="border-b border-rosa-100 bg-white">
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

      {/* Categorías con foto */}
      {visibleCats.length > 0 && (
        <Section title="Explora por categoría" link={{ to: "/catalogo", label: "Ver todo el catálogo" }}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4 sm:gap-x-6">
            {visibleCats.map((c, i) => (
              <Link key={c.id} to={`/categoria/${c.slug}`} className="group flex flex-col items-center text-center">
                <span className={`grid aspect-square w-full max-w-[11rem] place-items-center rounded-full ${PASTEL[i % PASTEL.length]} transition group-hover:shadow-[var(--shadow-suave)]`}>
                  <ProductImage src={c.imageUrl} alt="" className="w-[72%] drop-shadow-[0_10px_12px_rgb(122_77_58/0.18)] transition duration-500 group-hover:scale-105" />
                </span>
                <span className="mt-3 font-display text-[16px] font-semibold text-cafe-900 group-hover:text-rosa-600">{c.name}</span>
                <span className="text-sm text-cafe-500">{c.productCount} producto{c.productCount === 1 ? "" : "s"}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <ProductSection query={{ bestSellers: "true", sort: "popular", pageSize: 4 }} title="Más vendidos" hideIfEmpty />
      <ProductSection query={{ featured: "true", pageSize: 8, sort: "popular" }} title="Favoritos de la casa" intro="Lo que más nos piden para cumpleaños, regalos y antojos de fin de semana." link={{ to: "/catalogo", label: "Ver catálogo" }} />

      {/* Pasteles personalizados */}
      <section className="contenedor mt-20 sm:mt-24">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] bg-celeste px-6 py-12 sm:px-12 md:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="titulo-dulce">Tu pastel, a tu manera</h2>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-cafe-700">
              Elige el sabor del pan, el relleno, la cobertura y la decoración. Cuéntanos la temática y los colores de tu celebración y lo preparamos con todo el cariño.
            </p>
            <Link to="/categoria/pasteles-personalizados" className="btn-primario mt-7 px-7">Diseñar mi pastel</Link>
          </div>
          <img src={asset("/productos/pastel-corazon-moras-azules.webp")} alt="" className="mx-auto w-full max-w-xs drop-shadow-xl" />
        </div>
      </section>

      <ProductSection query={{ onSale: "true", pageSize: 4 }} title="Promociones" intro="Precios especiales por tiempo limitado." link={{ to: "/promociones", label: "Ver promociones" }} hideIfEmpty />
      <ProductSection query={{ category: "velas", pageSize: 4, sort: "popular" }} title="Velas que parecen postre" intro="Hechas a mano con cera de soya, para regalar o decorar. No son comestibles." link={{ to: "/categoria/velas", label: "Ver todas las velas" }} hideIfEmpty band />
      <ProductSection query={{ sort: "newest", pageSize: 4 }} title="Novedades" />

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
