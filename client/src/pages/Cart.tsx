import { AlertTriangle, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, ProductImage, QuantityStepper, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useCart, useCartActions } from "../hooks/useShop";
import { money } from "../lib/format";

export default function CartPage() {
  const { data: cart, isLoading, isError, refetch } = useCart();
  const { update, remove } = useCartActions();
  const { user } = useAuth();

  if (isLoading) return <Spinner label="Cargando tu carrito…" className="py-24" />;
  if (isError || !cart) return <div className="contenedor py-16"><ErrorState message="No pudimos cargar tu carrito." onRetry={refetch} /></div>;

  return (
    <div className="contenedor pt-10">
      <h1 className="mb-8 text-4xl">Tu carrito</h1>
      {cart.items.length === 0 ? (
        <EmptyState title="Tu carrito está vacío" icon={<ShoppingBag className="size-10" />}>
          Descubre nuestros pasteles, cupcakes y galletas.
          <div className="mt-5"><Link to="/catalogo" className="btn-primario">Ver catálogo</Link></div>
        </EmptyState>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-4" aria-label="Artículos del carrito">
            {cart.items.map((item) => (
              <li key={item.id} className={`tarjeta flex gap-4 p-4 ${item.issue ? "ring-2 ring-rosa-200" : ""}`}>
                <Link to={`/producto/${item.product.slug}`} className="shrink-0">
                  <ProductImage src={item.product.image} alt={item.product.name} className="size-24 rounded-2xl sm:size-28" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg leading-snug"><Link to={`/producto/${item.product.slug}`} className="hover:text-rosa-600">{item.product.name}</Link></h2>
                      {item.variantName && <p className="text-sm text-cafe-500">{item.variantName}</p>}
                    </div>
                    <p className="font-bold whitespace-nowrap text-cafe-900">{item.issue ? "—" : money(item.lineTotalCents)}</p>
                  </div>
                  {item.customizations.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-cafe-500">
                      {item.customizations.map((c, i) => (
                        <li key={i}><span className="font-semibold text-cafe-700">{c.optionName}:</span> {c.value}</li>
                      ))}
                    </ul>
                  )}
                  {item.issue && (
                    <p className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-error"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{item.issue}</p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <QuantityStepper value={item.quantity} max={item.maxQuantity} disabled={update.isPending} onChange={(q) => update.mutate({ id: item.id, quantity: q })} />
                    <div className="flex items-center gap-3">
                      {!item.issue && <span className="text-xs text-cafe-400">{money(item.unitPriceCents)} c/u</span>}
                      <button className="btn-fantasma btn-sm text-error" onClick={() => remove.mutate(item.id)} disabled={remove.isPending} aria-label={`Eliminar ${item.product.name}`}>
                        <Trash2 className="size-4" /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="tarjeta h-fit p-6 lg:sticky lg:top-32">
            <h2 className="text-xl">Resumen</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt>Artículos</dt><dd>{cart.itemCount}</dd></div>
              <div className="flex justify-between text-base font-bold text-cafe-900"><dt>Subtotal</dt><dd>{money(cart.subtotalCents)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-cafe-400">Envío, cupones y fecha de entrega se calculan en el siguiente paso.</p>
            {cart.hasIssues && <p className="mt-3 rounded-xl bg-rosa-50 p-3 text-sm font-semibold text-error">Resuelve los artículos marcados para continuar.</p>}
            {cart.hasIssues ? (
              <button className="btn-primario mt-5 w-full" disabled>Continuar con la compra</button>
            ) : (
              <Link to={user ? "/checkout" : "/ingresar?volver=/checkout"} className="btn-primario mt-5 w-full">Continuar con la compra</Link>
            )}
            <Link to="/catalogo" className="btn-fantasma mt-2 w-full">Seguir comprando</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
