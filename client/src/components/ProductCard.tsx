import { Clock, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartActions } from "../hooks/useShop";
import type { Product } from "../types";
import { Price, ProductImage } from "./ui";

/** Tarjeta de producto. Si no requiere elegir opciones, permite agregar directo al carrito. */
export function ProductCard({ product }: { product: Product }) {
  const { add } = useCartActions();
  const needsChoice = product.variants.length > 0 || product.options.some((o) => o.isRequired);
  const url = `/producto/${product.slug}`;

  return (
    <article className="group tarjeta flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevada)]">
      <Link to={url} className="relative block aspect-[4/3.4] overflow-hidden bg-rosa-50">
        <ProductImage src={product.images[0]?.url} alt={product.images[0]?.alt ?? product.name} className="size-full transition duration-500 group-hover:scale-[1.04]" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {product.salePriceCents && <span className="rounded-full bg-rosa-600 px-2.5 py-1 text-[11px] font-bold text-white">Promoción</span>}
          {!product.inStock && <span className="rounded-full bg-cafe-700 px-2.5 py-1 text-[11px] font-bold text-crema-50">Agotado</span>}
          {product.inStock && product.lowStock && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-aviso">Últimas piezas</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-[11px] font-bold tracking-[0.14em] text-cafe-400 uppercase">{product.category.name}</p>
        <h3 className="text-[17px] leading-snug">
          <Link to={url} className="hover:text-rosa-600">{product.name}</Link>
        </h3>
        <p className="line-clamp-2 text-sm text-cafe-500">{product.shortDescription}</p>
        {product.prepTimeHours >= 24 && (
          <p className="flex items-center gap-1 text-xs text-cafe-500">
            <Clock className="size-3.5" /> {Math.ceil(product.prepTimeHours / 24)} día(s) de anticipación
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <div className="text-[15px]">
            {product.variants.length > 0 && <span className="mr-1 text-xs text-cafe-500">Desde</span>}
            <Price cents={product.effectivePriceCents} originalCents={product.salePriceCents ? product.priceCents : null} />
          </div>
          {needsChoice ? (
            <Link to={url} className="btn-secundario btn-sm">{product.options.length ? "Personalizar" : "Elegir"}</Link>
          ) : (
            <button
              className="btn-primario btn-sm"
              disabled={!product.inStock || add.isPending}
              onClick={() => add.mutate({ productId: product.id, quantity: 1, selections: {} })}
              aria-label={`Agregar ${product.name} al carrito`}
            >
              <ShoppingBag className="size-4" /> Agregar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
