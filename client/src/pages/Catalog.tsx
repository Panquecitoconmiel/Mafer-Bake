import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProductGrid } from "../components/ProductCard";
import { Breadcrumbs, EmptyState, ErrorState, Pagination, Spinner } from "../components/ui";
import { useCategories } from "../hooks/useShop";
import { api } from "../services/api";

const SORTS = [
  { value: "popular", label: "Más populares" },
  { value: "newest", label: "Más recientes" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "name", label: "Nombre (A–Z)" },
];

export default function Catalog({ promotions = false }: { promotions?: boolean }) {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: categories } = useCategories();
  const [showFilters, setShowFilters] = useState(false);
  const category = categories?.find((c) => c.slug === slug);

  const query = {
    q: params.get("q") ?? undefined,
    category: slug,
    minPrice: params.get("min") ?? undefined,
    maxPrice: params.get("max") ?? undefined,
    available: params.get("disponibles") === "1" ? "true" : undefined,
    onSale: promotions ? "true" : undefined,
    sort: params.get("orden") ?? "popular",
    page: params.get("pagina") ?? "1",
    pageSize: 12,
  };
  const { data, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["products", query], queryFn: () => api.products(query), placeholderData: (prev) => prev });

  const [min, setMin] = useState(query.minPrice ?? "");
  const [max, setMax] = useState(query.maxPrice ?? "");
  useEffect(() => {
    setMin(params.get("min") ?? "");
    setMax(params.get("max") ?? "");
  }, [params]);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) v ? next.set(k, v) : next.delete(k);
    if (!("pagina" in changes)) next.delete("pagina");
    setParams(next);
  };
  const applyPrice = (e: FormEvent) => {
    e.preventDefault();
    update({ min: min.replace(/\D/g, "") || null, max: max.replace(/\D/g, "") || null });
    setShowFilters(false);
  };
  const hasFilters = !!(query.q || query.minPrice || query.maxPrice || query.available);

  const title = promotions ? "Promociones" : category?.name ?? (slug ? "Categoría" : query.q ? `Resultados para «${query.q}»` : "Catálogo");
  const description = promotions ? "Precios especiales por tiempo limitado." : category?.description ?? "Pasteles, cupcakes, galletas y postres hechos a mano.";

  const filters = (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 font-sans text-xs font-bold tracking-[0.16em] text-cafe-500 uppercase">Categorías</h2>
        <ul className="space-y-1">
          <li>
            <Link to={`/catalogo${query.q ? `?q=${encodeURIComponent(query.q)}` : ""}`} aria-current={!slug && !promotions ? "page" : undefined} className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-crema-200 aria-[current=page]:bg-rosa-100 aria-[current=page]:text-rosa-700">
              Todo el catálogo
            </Link>
          </li>
          {categories?.filter((c) => c.productCount > 0).map((c) => (
            <li key={c.id}>
              <Link to={`/categoria/${c.slug}`} aria-current={slug === c.slug ? "page" : undefined} className="flex justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-crema-200 aria-[current=page]:bg-rosa-100 aria-[current=page]:text-rosa-700">
                {c.name} <span className="text-cafe-400">{c.productCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <form onSubmit={applyPrice}>
        <h2 className="mb-3 font-sans text-xs font-bold tracking-[0.16em] text-cafe-500 uppercase">Precio (MXN)</h2>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="pmin">Precio mínimo</label>
          <input id="pmin" inputMode="numeric" className="campo" placeholder="Mín." value={min} onChange={(e) => setMin(e.target.value)} />
          <span className="text-cafe-400">–</span>
          <label className="sr-only" htmlFor="pmax">Precio máximo</label>
          <input id="pmax" inputMode="numeric" className="campo" placeholder="Máx." value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
        <button className="btn-secundario btn-sm mt-3 w-full">Aplicar precio</button>
      </form>
      <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
        <input type="checkbox" className="size-5 accent-rosa-600" checked={!!query.available} onChange={(e) => update({ disponibles: e.target.checked ? "1" : null })} />
        Solo disponibles
      </label>
      {hasFilters && (
        <button className="btn-fantasma btn-sm" onClick={() => setParams(new URLSearchParams())}>
          <X className="size-4" /> Limpiar filtros
        </button>
      )}
    </div>
  );

  return (
    <div className="contenedor pt-8">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Catálogo", to: slug || promotions ? "/catalogo" : undefined }, ...(slug || promotions ? [{ label: title }] : [])]} />
      <header className="mb-8">
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-2 text-cafe-500">{description}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-cafe-500" aria-live="polite">
              {data ? `${data.total} producto${data.total === 1 ? "" : "s"}` : " "}
              {isFetching && !isLoading && " · actualizando…"}
            </p>
            <div className="flex items-center gap-2">
              <button className="btn-secundario btn-sm lg:hidden" onClick={() => setShowFilters(true)} aria-expanded={showFilters}>
                <SlidersHorizontal className="size-4" /> Filtros
              </button>
              <label htmlFor="orden" className="sr-only">Ordenar por</label>
              <select id="orden" className="campo min-h-9 w-auto rounded-full py-0 text-sm" value={query.sort} onChange={(e) => update({ orden: e.target.value })}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {isLoading ? (
            <Spinner label="Cargando productos…" />
          ) : isError ? (
            <ErrorState message="No pudimos cargar el catálogo." onRetry={refetch} />
          ) : data && data.items.length > 0 ? (
            <>
              <ProductGrid products={data.items} />
              <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ pagina: String(p) })} />
            </>
          ) : (
            <EmptyState title="No encontramos productos">
              Prueba con otra búsqueda o quita algunos filtros. <br />
              <Link to="/catalogo" className="mt-3 inline-block font-bold text-rosa-600 hover:underline">Ver todo el catálogo</Link>
            </EmptyState>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <div className="absolute inset-0 bg-cafe-900/40" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-crema-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl">Filtros</h2>
              <button className="grid size-10 place-items-center rounded-full hover:bg-crema-200" onClick={() => setShowFilters(false)} aria-label="Cerrar filtros"><X className="size-5" /></button>
            </div>
            {filters}
          </div>
        </div>
      )}
    </div>
  );
}
