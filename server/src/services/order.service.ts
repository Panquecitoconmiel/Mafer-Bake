import type { Order, Prisma, StoreSettings } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma, type Tx } from "../config/prisma.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { orderNumber, parseDateOnly, toDateOnly } from "../utils/format.js";
import { getCartView, type CartView } from "./cart.service.js";
import { couponDiscount } from "./pricing.service.js";
import { assertSlotAvailable, getSettings } from "./settings.service.js";

export interface CheckoutInput {
  deliveryMethod: "PICKUP" | "DELIVERY";
  addressId?: string | null;
  requestedDate?: string;
  slotId?: string;
  couponCode?: string | null;
  notes?: string | null;
}

/** Valida un cupón contra las reglas actuales. Lanza un error con el motivo. */
export async function validateCoupon(tx: Tx, code: string, userId: string, subtotalCents: number) {
  const coupon = await tx.coupon.findUnique({ where: { code: code.toUpperCase() } });
  const now = new Date();
  if (!coupon || !coupon.isActive) throw badRequest("El cupón no existe o no está activo.");
  if (coupon.startsAt && coupon.startsAt > now) throw badRequest("El cupón aún no está vigente.");
  if (coupon.endsAt && coupon.endsAt < now) throw badRequest("El cupón ya venció.");
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) throw badRequest("El cupón ya alcanzó su límite de usos.");
  if (coupon.minSubtotalCents != null && subtotalCents < coupon.minSubtotalCents) {
    throw badRequest(`El cupón requiere una compra mínima de $${(coupon.minSubtotalCents / 100).toFixed(2)} MXN.`);
  }
  if (coupon.maxUsesPerUser != null) {
    const used = await tx.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.maxUsesPerUser) throw badRequest("Ya utilizaste este cupón el número máximo de veces.");
  }
  return coupon;
}

function deliveryRules(settings: StoreSettings, method: CheckoutInput["deliveryMethod"]) {
  if (method === "PICKUP" && !settings.pickupEnabled) throw badRequest("La recogida en tienda no está disponible.");
  if (method === "DELIVERY" && (!settings.deliveryEnabled || settings.deliveryFeeCents == null)) {
    throw badRequest("La entrega a domicilio no está disponible por el momento.");
  }
}

/** Calcula los importes del pedido con datos del servidor. */
export async function computeTotals(tx: Tx, userId: string, view: CartView, input: CheckoutInput, settings: StoreSettings, strictCoupon: boolean) {
  const subtotalCents = view.subtotalCents;
  let discountCents = 0;
  let coupon: Awaited<ReturnType<typeof validateCoupon>> | null = null;
  let couponError: string | null = null;

  if (input.couponCode) {
    try {
      coupon = await validateCoupon(tx, input.couponCode, userId, subtotalCents);
      discountCents = couponDiscount(coupon, subtotalCents);
    } catch (e) {
      if (strictCoupon) throw e;
      couponError = e instanceof Error ? e.message : "Cupón no válido.";
    }
  }

  let shippingCents = 0;
  if (input.deliveryMethod === "DELIVERY" && settings.deliveryFeeCents != null) {
    const freeMin = settings.freeDeliveryMinCents;
    shippingCents = freeMin != null && subtotalCents - discountCents >= freeMin ? 0 : settings.deliveryFeeCents;
  }

  let taxCents = 0;
  if (!settings.pricesIncludeTax && settings.taxRatePercent != null) {
    taxCents = Math.round(((subtotalCents - discountCents) * Number(settings.taxRatePercent)) / 100);
  }

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents - discountCents + shippingCents + taxCents,
    coupon,
    couponError,
    pricesIncludeTax: settings.pricesIncludeTax,
  };
}

/** Cotización previa para la pantalla de checkout (no reserva nada). */
export async function quote(userId: string, cartId: string | null, input: CheckoutInput) {
  const settings = await getSettings();
  const view = await getCartView(cartId);
  const totals = await computeTotals(prisma, userId, view, input, settings, false);
  return {
    subtotalCents: totals.subtotalCents,
    discountCents: totals.discountCents,
    shippingCents: totals.shippingCents,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
    couponCode: totals.coupon?.code ?? null,
    couponError: totals.couponError,
    pricesIncludeTax: totals.pricesIncludeTax,
    leadHours: Math.max(settings.minLeadHours, view.maxPrepTimeHours),
    hasIssues: view.hasIssues,
    itemCount: view.itemCount,
  };
}

/** Libera inventario apartado y el uso de cupón. Seguro ante llamadas repetidas. */
export async function releaseOrderHolds(tx: Tx, orderId: string, reason: string) {
  const { count } = await tx.order.updateMany({ where: { id: orderId, stockReleased: false }, data: { stockReleased: true } });
  if (count === 0) return; // ya se liberó

  const reservations = await tx.inventoryMovement.findMany({ where: { orderId, type: "RESERVATION" } });
  for (const r of reservations) {
    const qty = Math.abs(r.quantity);
    const p = await tx.product.update({ where: { id: r.productId }, data: { stock: { increment: qty } } });
    await tx.inventoryMovement.create({
      data: { productId: r.productId, type: "RELEASE", quantity: qty, stockAfter: p.stock, reason, orderId },
    });
  }

  const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
  if (redemption) {
    await tx.couponRedemption.delete({ where: { id: redemption.id } });
    await tx.coupon.update({ where: { id: redemption.couponId }, data: { usedCount: { decrement: 1 } } });
  }
}

/**
 * Crea el pedido de forma atómica:
 * valida carrito, precios, fecha/franja (con bloqueo por franja), cupón e inventario;
 * aparta existencias y vacía el carrito. Idempotente por `idempotencyKey`.
 */
export async function createOrder(
  userId: string,
  cartId: string | null,
  input: CheckoutInput & { requestedDate: string; slotId: string; idempotencyKey: string; expectedTotalCents: number },
) {
  const previous = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (previous) {
    if (previous.userId !== userId) throw conflict("Clave de idempotencia ya utilizada.");
    return { order: previous, reused: true };
  }
  if (!cartId) throw badRequest("Tu carrito está vacío.");

  const order = await prisma.$transaction(
    async (tx) => {
      const settings = await getSettings(tx);
      deliveryRules(settings, input.deliveryMethod);

      const view = await getCartView(cartId, tx);
      if (view.lines.length === 0) throw badRequest("Tu carrito está vacío.");
      if (view.hasIssues) throw conflict("Algunos artículos de tu carrito cambiaron. Revísalo antes de continuar.", { code: "CART_ISSUES" });

      let addressSnapshot: Prisma.InputJsonValue | undefined;
      if (input.deliveryMethod === "DELIVERY") {
        if (!input.addressId) throw badRequest("Selecciona una dirección de entrega.");
        const addr = await tx.address.findFirst({ where: { id: input.addressId, userId } });
        if (!addr) throw badRequest("La dirección seleccionada no existe.");
        const { id, userId: _u, createdAt, updatedAt, isDefault, ...snap } = addr;
        addressSnapshot = snap;
      }

      // Serializa la validación de cupo por fecha+franja entre pedidos simultáneos.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.requestedDate}|${input.slotId}`}))`;
      const leadHours = Math.max(settings.minLeadHours, view.maxPrepTimeHours);
      await assertSlotAvailable(input.requestedDate, input.slotId, leadHours, tx);
      const slot = await tx.deliverySlot.findUniqueOrThrow({ where: { id: input.slotId } });

      const totals = await computeTotals(tx, userId, view, input, settings, true);
      if (totals.totalCents !== input.expectedTotalCents) {
        throw conflict("El total de tu pedido cambió. Revisa el nuevo resumen antes de pagar.", {
          code: "PRICE_CHANGED",
          totalCents: totals.totalCents,
        });
      }
      if (totals.totalCents <= 0) throw badRequest("El total del pedido debe ser mayor a cero.");

      const created = await tx.order.create({
        data: {
          userId,
          deliveryMethod: input.deliveryMethod,
          addressSnapshot,
          requestedDate: parseDateOnly(input.requestedDate),
          requestedSlot: slot.id,
          subtotalCents: totals.subtotalCents,
          discountCents: totals.discountCents,
          shippingCents: totals.shippingCents,
          taxCents: totals.taxCents,
          totalCents: totals.totalCents,
          currency: env.STRIPE_CURRENCY,
          couponCode: totals.coupon?.code ?? null,
          customerNotes: input.notes || null,
          idempotencyKey: input.idempotencyKey,
          items: {
            create: view.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              productName: l.product.name,
              variantName: l.variantName,
              imageUrl: l.product.image,
              unitPriceCents: l.unitPriceCents,
              quantity: l.quantity,
              lineTotalCents: l.lineTotalCents,
              customizations: { create: l.customizations },
            })),
          },
        },
      });

      // Apartado de inventario con decremento condicional (nunca negativo).
      const tracked = new Map<string, number>();
      for (const l of view.lines) {
        if (l.product.inventoryMode === "TRACKED") tracked.set(l.productId, (tracked.get(l.productId) ?? 0) + l.quantity);
      }
      for (const [productId, qty] of tracked) {
        const { count } = await tx.product.updateMany({ where: { id: productId, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
        if (count === 0) throw conflict("Uno de los productos se agotó mientras completabas tu compra.", { code: "OUT_OF_STOCK" });
        const p = await tx.product.findUniqueOrThrow({ where: { id: productId } });
        await tx.inventoryMovement.create({
          data: { productId, type: "RESERVATION", quantity: -qty, stockAfter: p.stock, reason: `Apartado por pedido ${orderNumber(created.number)}`, orderId: created.id },
        });
      }

      if (totals.coupon) {
        const c = totals.coupon;
        const { count } = await tx.coupon.updateMany({
          where: { id: c.id, ...(c.maxUses != null && { usedCount: { lt: c.maxUses } }) },
          data: { usedCount: { increment: 1 } },
        });
        if (count === 0) throw badRequest("El cupón ya alcanzó su límite de usos.");
        await tx.couponRedemption.create({ data: { couponId: c.id, userId, orderId: created.id } });
      }

      await tx.cartItem.deleteMany({ where: { cartId } });
      return created;
    },
    { timeout: 15_000 },
  );

  return { order, reused: false };
}

export const orderDetailInclude = {
  items: { include: { customizations: true } },
  payments: { include: { refunds: true }, orderBy: { createdAt: "desc" } },
} satisfies Prisma.OrderInclude;

type OrderDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

export async function slotLabels(ids: string[]) {
  const slots = await prisma.deliverySlot.findMany({ where: { id: { in: ids } } });
  return new Map(slots.map((s) => [s.id, s.label]));
}

export function serializeOrder(o: Order & Partial<OrderDetail>, slotLabel?: string) {
  return {
    id: o.id,
    number: orderNumber(o.number),
    status: o.status,
    paymentStatus: o.paymentStatus,
    deliveryMethod: o.deliveryMethod,
    address: o.addressSnapshot,
    requestedDate: toDateOnly(o.requestedDate),
    requestedSlot: slotLabel ?? o.requestedSlot,
    confirmedDate: o.confirmedDate ? toDateOnly(o.confirmedDate) : null,
    subtotalCents: o.subtotalCents,
    discountCents: o.discountCents,
    shippingCents: o.shippingCents,
    taxCents: o.taxCents,
    totalCents: o.totalCents,
    currency: o.currency,
    couponCode: o.couponCode,
    customerNotes: o.customerNotes,
    paidAt: o.paidAt,
    cancelledAt: o.cancelledAt,
    createdAt: o.createdAt,
    items: o.items?.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      variantName: i.variantName,
      imageUrl: i.imageUrl,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      lineTotalCents: i.lineTotalCents,
      customizations: i.customizations.map((c) => ({ optionName: c.optionName, value: c.value, priceDeltaCents: c.priceDeltaCents })),
    })),
    payments: o.payments?.map((p) => ({
      id: p.id,
      status: p.status,
      amountCents: p.amountCents,
      refundedCents: p.refundedCents,
      createdAt: p.createdAt,
    })),
  };
}

export async function listMyOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { customizations: true } } },
    take: 100,
  });
  const labels = await slotLabels(orders.map((o) => o.requestedSlot));
  return orders.map((o) => serializeOrder(o, labels.get(o.requestedSlot)));
}

/** Solo devuelve el pedido si pertenece al usuario (404 en caso contrario). */
export async function getMyOrder(userId: string, orderId: string) {
  const o = await prisma.order.findFirst({ where: { id: orderId, userId }, include: orderDetailInclude });
  if (!o) throw notFound("Pedido no encontrado.");
  const labels = await slotLabels([o.requestedSlot]);
  return serializeOrder(o, labels.get(o.requestedSlot));
}
