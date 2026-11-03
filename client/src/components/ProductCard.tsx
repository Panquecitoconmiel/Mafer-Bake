import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartActions } from "../hooks/useShop";
import { money } from "../lib/format";
import type { Product } from "../types";
import { ProductImage } from "./ui";

/** Fondos pastel que se alternan detrás de las fotos recortadas. */
export const TONOS = ["bg-rosa-100", "bg-celeste", "bg-vainilla", "bg-durazno-100"];

/** Tarjeta de producto. Si no requiere elegir opciones, permite agregar directo al carrito. */
export function ProductCard({ product, tone = 0 }: { product: Product; tone?: number }) {
  const { add } = useCartActions();
  const needsChoice = product.variants.length > 0 || product.options.some((o) => o.isRequired);
  const url = `/producto/${product.slug}`;
  const onSale = product.salePriceCents != null;

  return (
    <article className="group flex flex-col">
      <Link to={url} className={`relative block aspect-square overflow-hidden rounded-[1.4rem] ${TONOS[tone % TONOS.length]}`} tabIndex={-1} aria-hidden="true">
        <ProductImage
          src={product.images[0]?.url}
          alt=""
          className="size-full p-[9%] drop-shadow-[0_12px_14px_rgb(122_77_58/0.16)] transition duration-500 ease-out group-hover:scale-[1.04]"
        />
        {(onSale || !product.inStock || product.lowStock) && (
          <span
            className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-bold ${
              !product.inStock ? "bg-cafe-700 text-white" : onSale ? "bg-rosa-600 text-white" : "bg-white/95 text-aviso"
            }`}
          >
            {!product.inStock ? "Agotado" : onSale ? "Promoción" : "Últimas piezas"}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-1 pt-3">
        <h3 className="font-display text-[16px] leading-snug font-semibold sm:text-[17px]">
          <Link to={url} className="hover:text-rosa-600 focus-visible:text-rosa-600">{product.name}</Link>
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-cafe-500">{product.shortDescription}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <p className="flex flex-wrap items-baseline gap-x-1.5 text-cafe-900">
            {product.variants.length > 0 && <span className="text-xs text-cafe-500">Desde</span>}
            <span className="font-bold">{money(product.effectivePriceCents)}</span>
            {onSale && <s className="text-xs text-cafe-400">{money(product.priceCents)}</s>}
          </p>
          {needsChoice ? (
            <Link to={url} className="btn-secundario btn-sm shrink-0" aria-label={`Elegir opciones de ${product.name}`}>Elegir</Link>
          ) : (
            <button
              className="grid size-9 shrink-0 place-items-center rounded-full bg-rosa-600 text-white transition hover:bg-rosa-700 disabled:opacity-50"
              disabled={!product.inStock || add.isPending}
              onClick={() => add.mutate({ productId: product.id, quantity: 1, selections: {} })}
              aria-label={`Agregar ${product.name} al carrito`}
              title="Agregar al carrito"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} tone={i} />
      ))}
    </div>
  );
}
