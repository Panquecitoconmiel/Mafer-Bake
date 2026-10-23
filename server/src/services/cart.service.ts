import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma, type Tx } from "../config/prisma.js";
import { randomToken, sha256 } from "../utils/crypto.js";
import { AppError, badRequest, notFound } from "../utils/errors.js";
import { productInclude, purchasable } from "./catalog.service.js";
import { configKey, resolveLine, type Selections } from "./pricing.service.js";

export const CART_COOKIE = "mafer_cart";
const cartCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 86_400_000,
});

/** Obtiene (o crea) el carrito del usuario autenticado o del invitado (cookie). */
export async function resolveCart(req: Request, res: Response, create: boolean) {
  if (req.user) {
    if (!create) return prisma.cart.findUnique({ where: { userId: req.user.id } });
    return prisma.cart.upsert({ where: { userId: req.user.id }, update: {}, create: { userId: req.user.id } });
  }
  const token = req.cookies?.[CART_COOKIE];
  if (typeof token === "string" && token.length >= 20) {
    const cart = await prisma.cart.findUnique({ where: { guestToken: sha256(token) } });
    if (cart) return cart;
  }
  if (!create) return null;
  const newToken = randomToken(24);
  res.cookie(CART_COOKIE, newToken, cartCookieOptions());
  return prisma.cart.create({ data: { guestToken: sha256(newToken) } });
}

/** Al iniciar sesión, mueve los artículos del carrito de invitado al del usuario. */
export async function mergeGuestCart(req: Request, res: Response, userId: string) {
  const token = req.cookies?.[CART_COOKIE];
  if (typeof token !== "string" || token.length < 20) return;
  const guest = await prisma.cart.findUnique({ where: { guestToken: sha256(token) }, include: { items: true } });
  res.clearCookie(CART_COOKIE, { path: "/" });
  if (!guest) return;

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId } });
    for (const item of guest.items) {
      await tx.cartItem.upsert({
        where: { cartId_configKey: { cartId: cart.id, configKey: item.configKey } },
        update: { quantity: { increment: item.quantity } },
        create: {
          cartId: cart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: Math.min(item.quantity, 99),
          selections: item.selections as Prisma.InputJsonValue,
          configKey: item.configKey,
        },
      });
    }
    await tx.cart.delete({ where: { id: guest.id } });
  });
}

const itemInclude = { product: { include: productInclude } } satisfies Prisma.CartItemInclude;

/**
 * Vista del carrito con precios ACTUALES del servidor. Los artículos con problemas
 * (agotados, despublicados, opciones que cambiaron) se marcan con `issue` y no suman al total.
 */
export async function getCartView(cartId: string | null, tx: Tx = prisma) {
  const items = cartId
    ? await tx.cartItem.findMany({ where: { cartId }, include: itemInclude, orderBy: { createdAt: "asc" } })
    : [];

  const lines = items.map((item) => {
    const p = item.product;
    let issue: string | null = null;
    let resolved: ReturnType<typeof resolveLine> | null = null;
    try {
      resolved = resolveLine(p, item.variantId, item.selections as Selections);
    } catch (e) {
      issue = e instanceof AppError ? `${e.message} Elimina el artículo y agrégalo de nuevo.` : "Configuración no válida.";
    }
    if (!purchasable(p)) issue = "Este producto ya no está disponible.";
    else if (p.inventoryMode === "TRACKED" && p.stock < item.quantity) issue = `Solo quedan ${p.stock} piezas disponibles.`;

    const unit = resolved?.unitPriceCents ?? 0;
    return {
      id: item.id,
      productId: p.id,
      product: { id: p.id, name: p.name, slug: p.slug, image: p.images[0]?.url ?? null, inventoryMode: p.inventoryMode, prepTimeHours: p.prepTimeHours },
      variantId: item.variantId,
      variantName: resolved?.variantName ?? null,
      customizations: resolved?.customizations ?? [],
      quantity: item.quantity,
      maxQuantity: p.inventoryMode === "TRACKED" ? Math.max(1, Math.min(p.stock, 99)) : 99,
      unitPriceCents: unit,
      lineTotalCents: unit * item.quantity,
      issue,
      _resolved: resolved,
      _product: p,
    };
  });

  const valid = lines.filter((l) => !l.issue);
  return {
    id: cartId,
    lines,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    subtotalCents: valid.reduce((s, l) => s + l.lineTotalCents, 0),
    hasIssues: lines.some((l) => l.issue),
    maxPrepTimeHours: valid.reduce((m, l) => Math.max(m, l.product.prepTimeHours), 0),
  };
}

export type CartView = Awaited<ReturnType<typeof getCartView>>;

/** Respuesta pública (sin campos internos). */
export function serializeCart(view: CartView) {
  return {
    id: view.id,
    itemCount: view.itemCount,
    subtotalCents: view.subtotalCents,
    hasIssues: view.hasIssues,
    items: view.lines.map(({ _resolved, _product, ...l }) => l),
  };
}

export async function addItem(cartId: string, input: { productId: string; variantId?: string | null; quantity: number; selections: Selections }) {
  const product = await prisma.product.findUnique({ where: { id: input.productId }, include: productInclude });
  if (!product || product.status !== "PUBLISHED") throw notFound("Producto no encontrado.");
  if (!purchasable(product)) throw badRequest("Este producto no está disponible por el momento.");

  const resolved = resolveLine(product, input.variantId ?? null, input.selections);
  const key = configKey(product.id, resolved.variantId, resolved.selections);
  const existing = await prisma.cartItem.findUnique({ where: { cartId_configKey: { cartId, configKey: key } } });
  const newQty = (existing?.quantity ?? 0) + input.quantity;

  if (newQty > 99) throw badRequest("La cantidad máxima por artículo es 99.");
  if (product.inventoryMode === "TRACKED" && newQty > product.stock) {
    throw badRequest(`Solo hay ${product.stock} piezas disponibles de «${product.name}».`);
  }

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId,
        productId: product.id,
        variantId: resolved.variantId,
        quantity: input.quantity,
        selections: resolved.selections as Prisma.InputJsonValue,
        configKey: key,
      },
    });
  }
  await prisma.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
}

export async function updateItem(cartId: string, itemId: string, quantity: number) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId }, include: { product: true } });
  if (!item) throw notFound("Artículo no encontrado en tu carrito.");
  if (item.product.inventoryMode === "TRACKED" && quantity > item.product.stock) {
    throw badRequest(`Solo hay ${item.product.stock} piezas disponibles.`);
  }
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
}

export async function removeItem(cartId: string, itemId: string) {
  const { count } = await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
  if (count === 0) throw notFound("Artículo no encontrado en tu carrito.");
}
