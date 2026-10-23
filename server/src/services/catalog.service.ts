import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/errors.js";
import type { z } from "zod";
import type { productQuerySchema } from "../validators/shop.validators.js";

export const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" } },
  variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
  options: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { values: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export const effectivePrice = (p: { priceCents: number; salePriceCents: number | null }) =>
  p.salePriceCents != null && p.salePriceCents < p.priceCents ? p.salePriceCents : p.priceCents;

/** ¿Se puede comprar ahora? Considera estado, disponibilidad e inventario. */
export function purchasable(p: { status: string; isAvailable: boolean; inventoryMode: string; stock: number }) {
  if (p.status !== "PUBLISHED" || !p.isAvailable) return false;
  return p.inventoryMode === "MADE_TO_ORDER" || p.stock > 0;
}

/** Forma pública del producto: no expone existencias exactas ni datos internos. */
export function toPublicProduct(p: ProductWithRelations) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    description: p.description,
    priceCents: p.priceCents,
    salePriceCents: p.salePriceCents != null && p.salePriceCents < p.priceCents ? p.salePriceCents : null,
    effectivePriceCents: effectivePrice(p),
    category: p.category,
    isFeatured: p.isFeatured,
    inventoryMode: p.inventoryMode,
    inStock: purchasable(p),
    lowStock: p.inventoryMode === "TRACKED" && p.stock > 0 && p.stock <= p.lowStockThreshold,
    maxQuantity: p.inventoryMode === "TRACKED" ? Math.min(p.stock, 99) : 99,
    prepTimeHours: p.prepTimeHours,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt || p.name })),
    variants: p.variants.map((v) => ({ id: v.id, name: v.name, priceDeltaCents: v.priceDeltaCents })),
    options: p.options.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      isRequired: o.isRequired,
      maxLength: o.maxLength,
      values: o.values.map((v) => ({ id: v.id, label: v.label, priceDeltaCents: v.priceDeltaCents })),
    })),
    createdAt: p.createdAt,
  };
}

export async function listProducts(q: z.infer<typeof productQuerySchema>) {
  const and: Prisma.ProductWhereInput[] = [{ status: "PUBLISHED" }, { category: { isActive: true } }];
  if (q.q) {
    and.push({
      OR: [
        { name: { contains: q.q, mode: "insensitive" } },
        { shortDescription: { contains: q.q, mode: "insensitive" } },
      ],
    });
  }
  if (q.category) and.push({ category: { slug: q.category } });
  if (q.featured === "true") and.push({ isFeatured: true });
  if (q.onSale === "true") and.push({ salePriceCents: { not: null } });
  if (q.available === "true") {
    and.push({ isAvailable: true, OR: [{ inventoryMode: "MADE_TO_ORDER" }, { stock: { gt: 0 } }] });
  }
  // Filtro por precio efectivo (promoción si existe): en pesos → centavos.
  const min = q.minPrice != null ? q.minPrice * 100 : undefined;
  const max = q.maxPrice != null ? q.maxPrice * 100 : undefined;
  if (min != null || max != null) {
    const range = { ...(min != null && { gte: min }), ...(max != null && { lte: max }) };
    and.push({
      OR: [
        { salePriceCents: null, priceCents: range },
        { salePriceCents: range },
      ],
    });
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    q.sort === "newest"
      ? [{ createdAt: "desc" }]
      : q.sort === "price_asc"
        ? [{ priceCents: "asc" }]
        : q.sort === "price_desc"
          ? [{ priceCents: "desc" }]
          : q.sort === "name"
            ? [{ name: "asc" }]
            : [{ soldCount: "desc" }, { isFeatured: "desc" }, { createdAt: "desc" }];

  const where = { AND: and };
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      include: productInclude,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  // El orden por precio en BD usa el precio normal; se reordena por precio efectivo en la página.
  const mapped = items.map(toPublicProduct);
  if (q.sort === "price_asc") mapped.sort((a, b) => a.effectivePriceCents - b.effectivePriceCents);
  if (q.sort === "price_desc") mapped.sort((a, b) => b.effectivePriceCents - a.effectivePriceCents);

  return { items: mapped, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export async function getProductBySlug(slug: string) {
  const p = await prisma.product.findFirst({
    where: { slug, status: "PUBLISHED", category: { isActive: true } },
    include: productInclude,
  });
  if (!p) throw notFound("Producto no encontrado.");
  return toPublicProduct(p);
}

export async function listCategories() {
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
  });
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    productCount: c._count.products,
  }));
}
