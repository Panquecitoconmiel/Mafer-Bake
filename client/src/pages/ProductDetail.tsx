import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Heart, PackageCheck, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Breadcrumbs, ErrorState, Price, ProductImage, QuantityStepper, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { errorMessage, useCartActions } from "../hooks/useShop";
import { delta, money, prepTime } from "../lib/format";
import { api, ApiError } from "../services/api";
import type { Product, Selections } from "../types";

/** Calcula en el navegador el precio estimado (el servidor siempre recalcula el definitivo). */
function estimate(p: Product, variantId: string | null, sel: Selections) {
  let cents = p.effectivePriceCents;
  const v = p.variants.find((x) => x.id === variantId);
  if (v) cents += v.priceDeltaCents;
  for (const o of p.options) {
    const raw = sel[o.id];
    if (o.type === "TEXT" || raw == null) continue;
    const ids = Array.isArray(raw) ? raw : [raw];
    for (const id of ids) cents += o.values.find((x) => x.id === id)?.priceDeltaCents ?? 0;
  }
  return cents;
}

function Customizer({ product, variantId, setVariantId, sel, setSel, errors }: {
  product: Product; variantId: string | null; setVariantId: (id: string) => void; sel: Selections; setSel: (s: Selections) => void; errors: Record<string, string>;
}) {
  const set = (id: string, v: string | string[]) => setSel({ ...sel, [id]: v });
  return (
    <div className="space-y-6">
      {product.variants.length > 0 && (
        <fieldset>
          <legend className="etiqueta">Presentación <span className="text-rosa-600">*</span></legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {product.variants.map((v) => (
              <label key={v.id} className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm transition ${variantId === v.id ? "border-rosa-600 bg-rosa-50 ring-1 ring-rosa-600" : "border-crema-300 bg-white hover:border-empolvado"}`}>
                <input type="radio" name="variant" className="sr-only" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                <span className="font-semibold">{v.name}</span>
                <span className="text-cafe-500">{money(product.effectivePriceCents + v.priceDeltaCents)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {product.options.map((o) => {
        const err = errors[o.id];
        if (o.type === "TEXT") {
          const val = (sel[o.id] as string) ?? "";
          const max = o.maxLength ?? 120;
          return (
            <div key={o.id}>
              <label htmlFor={`opt-${o.id}`} className="etiqueta">{o.name}{o.isRequired && <span className="text-rosa-600"> *</span>}</label>
              {max > 80 ? (
                <textarea id={`opt-${o.id}`} rows={3} maxLength={max} className="campo" value={val} onChange={(e) => set(o.id, e.target.value)} aria-invalid={!!err} />
              ) : (
                <input id={`opt-${o.id}`} maxLength={max} className="campo" value={val} onChange={(e) => set(o.id, e.target.value)} aria-invalid={!!err} />
              )}
              <p className="ayuda">{val.length}/{max} caracteres{o.isRequired ? "" : " · opcional"}</p>
              {err && <p className="error-campo">{err}</p>}
            </div>
          );
        }
        const multi = o.type === "MULTIPLE";
        const current = sel[o.id];
        const selected = new Set(Array.isArray(current) ? current : current ? [current] : []);
        return (
          <fieldset key={o.id}>
            <legend className="etiqueta">
              {o.name}{o.isRequired && <span className="text-rosa-600"> *</span>}
              {multi && <span className="ml-1 font-normal text-cafe-400">(elige una o varias)</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {o.values.map((v) => {
                const on = selected.has(v.id);
                return (
                  <button
                    type="button"
                    key={v.id}
                    aria-pressed={on}
                    className="chip"
                    onClick={() => {
                      if (multi) {
                        const next = new Set(selected);
                        on ? next.delete(v.id) : next.add(v.id);
                        set(o.id, [...next]);
                      } else set(o.id, v.id);
                    }}
                  >
                    {on && <Check className="size-3.5" />}
                    {v.label}
                    {v.priceDeltaCents !== 0 && <span className={on ? "text-rosa-200" : "text-cafe-400"}>{delta(v.priceDeltaCents)}</span>}
                  </button>
                );
              })}
            </div>
            {err && <p className="error-campo">{err}</p>}
          </fieldset>
        );
      })}
    </div>
  );
}

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const { data: product, isLoading, isError, error, refetch } = useQuery({ queryKey: ["product", slug], queryFn: () => api.product(slug) });

  if (isLoading) return <Spinner label="Cargando producto…" className="py-24" />;
  if (isError || !product) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="contenedor py-16">
        {notFound ? (
          <div className="text-center">
            <h1 className="text-3xl">Producto no encontrado</h1>
            <p className="mt-2 text-cafe-500">Es posible que ya no esté disponible.</p>
            <Link to="/catalogo" className="btn-primario mt-6">Ver catálogo</Link>
          </div>
        ) : (
          <ErrorState message="No pudimos cargar el producto." onRetry={refetch} />
        )}
      </div>
    );
  }
  return <ProductView key={product.id} product={product} />;
}

function ProductView({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const notify = useToast();
  const qc = useQueryClient();
  const { add } = useCartActions();
  const [variantId, setVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const [sel, setSel] = useState<Selections>(() => {
    // Preselecciona el primer valor de las opciones obligatorias de elección única.
    const init: Selections = {};
    for (const o of product.options) if (o.isRequired && o.type === "SINGLE" && o.values[0]) init[o.id] = o.values[0].id;
    return init;
  });
  const [qty, setQty] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [image, setImage] = useState(0);

  const { data: favorites } = useQuery({ queryKey: ["favorites"], queryFn: api.favorites, enabled: !!user });
  const isFav = favorites?.some((f) => f.productId === product.id) ?? false;
  const toggleFav = useMutation({
    mutationFn: () => (isFav ? api.removeFavorite(product.id) : api.addFavorite(product.id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      notify(isFav ? "Quitado de favoritos." : "Guardado en tus favoritos.");
    },
    onError: (e) => notify(errorMessage(e), "error"),
  });

  const unit = useMemo(() => estimate(product, variantId, sel), [product, variantId, sel]);
  const customizations = product.options.filter((o) => o.isRequired || sel[o.id]);

  const submit = (goToCart: boolean) => {
    const errs: Record<string, string> = {};
    for (const o of product.options) {
      const v = sel[o.id];
      const empty = v == null || (Array.isArray(v) ? v.length === 0 : !String(v).trim());
      if (o.isRequired && empty) errs[o.id] = "Elige una opción.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      notify("Completa las opciones marcadas para continuar.", "error");
      return;
    }
    const clean = Object.fromEntries(Object.entries(sel).filter(([, v]) => (Array.isArray(v) ? v.length : String(v).trim())));
    add.mutate({ productId: product.id, variantId, quantity: qty, selections: clean }, { onSuccess: () => goToCart && navigate("/carrito") });
  };

  return (
    <div className="contenedor pt-8">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: product.category.name, to: `/categoria/${product.category.slug}` }, { label: product.name }]} />
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Galería */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="overflow-hidden rounded-[1.75rem] bg-rosa-50 shadow-[var(--shadow-suave)]">
            <ProductImage src={product.images[image]?.url} alt={product.images[image]?.alt ?? product.name} className="aspect-square w-full" />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, i) => (
                <button key={img.url} onClick={() => setImage(i)} aria-label={`Ver imagen ${i + 1}`} aria-pressed={image === i} className={`size-20 overflow-hidden rounded-xl border-2 ${image === i ? "border-rosa-600" : "border-transparent"}`}>
                  <ProductImage src={img.url} alt="" className="size-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información y personalización */}
        <div>
          <p className="sobretitulo">{product.category.name}</p>
          <h1 className="mt-2 text-4xl sm:text-[2.75rem] sm:leading-tight">{product.name}</h1>
          <div className="mt-3 text-2xl">
            <Price cents={product.effectivePriceCents} originalCents={product.salePriceCents ? product.priceCents : null} />
            {product.variants.length > 0 && <span className="ml-2 text-sm text-cafe-400">precio base</span>}
          </div>
          <p className="mt-5 leading-relaxed text-cafe-500">{product.description}</p>

          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <li className="flex items-center gap-1.5"><Clock className="size-4 text-rosa-600" /> {prepTime(product.prepTimeHours)}</li>
            <li className="flex items-center gap-1.5">
              <PackageCheck className="size-4 text-rosa-600" />
              {!product.inStock ? <span className="font-semibold text-error">Agotado por ahora</span> : product.inventoryMode === "MADE_TO_ORDER" ? "Se prepara bajo pedido" : product.lowStock ? <span className="font-semibold text-aviso">¡Últimas piezas!</span> : "Disponible"}
            </li>
          </ul>

          <div className="tarjeta mt-7 p-5 sm:p-6">
            {(product.variants.length > 0 || product.options.length > 0) && (
              <>
                <h2 className="mb-5 text-xl">{product.options.length ? "Personaliza tu pedido" : "Elige la presentación"}</h2>
                <Customizer product={product} variantId={variantId} setVariantId={setVariantId} sel={sel} setSel={setSel} errors={errors} />
                <hr className="my-6 border-crema-200" />
              </>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <QuantityStepper value={qty} onChange={setQty} max={product.maxQuantity} disabled={!product.inStock} />
              <div className="text-right">
                <p className="text-xs text-cafe-400">Total estimado</p>
                <p className="text-2xl font-bold text-cafe-900">{money(unit * qty)}</p>
              </div>
            </div>
            {customizations.length > 0 && unit !== product.effectivePriceCents && (
              <p className="mt-2 text-xs text-cafe-400">Incluye {money(unit - product.effectivePriceCents)} por presentación y personalización, por pieza.</p>
            )}
            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
              <button className="btn-primario" disabled={!product.inStock || add.isPending} onClick={() => submit(false)}>
                <ShoppingBag className="size-4" /> {add.isPending ? "Agregando…" : "Agregar al carrito"}
              </button>
              <button className="btn-cafe" disabled={!product.inStock || add.isPending} onClick={() => submit(true)}>Comprar ahora</button>
            </div>
            {user ? (
              <button className="btn-fantasma btn-sm mt-3" onClick={() => toggleFav.mutate()} disabled={toggleFav.isPending} aria-pressed={isFav}>
                <Heart className={`size-4 ${isFav ? "fill-rosa-600 text-rosa-600" : ""}`} /> {isFav ? "En tus favoritos" : "Guardar en favoritos"}
              </button>
            ) : (
              <p className="mt-3 text-xs text-cafe-400"><Link to="/ingresar" className="font-bold text-rosa-600 hover:underline">Inicia sesión</Link> para guardar favoritos.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-cafe-400">El precio final se confirma en el carrito con la información más reciente.</p>
        </div>
      </div>
    </div>
  );
}
