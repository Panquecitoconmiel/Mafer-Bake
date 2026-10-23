import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma, type Tx } from "../config/prisma.js";
import { getStripe } from "../config/stripe.js";
import { AppError, badRequest, conflict, notFound, unavailable } from "../utils/errors.js";
import { orderNumber } from "../utils/format.js";
import { audit } from "./audit.service.js";
import { releaseOrderHolds } from "./order.service.js";

function requireStripe() {
  const stripe = getStripe();
  if (!stripe) throw unavailable("Los pagos en línea aún no están configurados. Inténtalo más tarde.");
  return stripe;
}

/**
 * Crea (o reutiliza) una sesión de Stripe Checkout para un pedido del cliente.
 * Los importes salen exclusivamente del pedido guardado en la base de datos.
 */
export async function createCheckoutSession(user: { id: string; email: string }, orderId: string) {
  const stripe = requireStripe();
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { items: { include: { customizations: true } }, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) throw notFound("Pedido no encontrado.");
  if (order.status !== "PENDING_PAYMENT" || order.paymentStatus === "PAID") {
    throw conflict("Este pedido ya no admite pagos.");
  }

  // Reutiliza una sesión abierta vigente: evita cobros duplicados por doble clic.
  const open = order.payments.find((p) => p.status === "PENDING" && p.checkoutUrl && p.expiresAt && p.expiresAt.getTime() > Date.now() + 60_000);
  if (open) return { url: open.checkoutUrl!, paymentId: open.id };

  const currency = order.currency;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((i) => {
    const details = [i.variantName, ...i.customizations.map((c) => `${c.optionName}: ${c.value}`)].filter(Boolean).join(" · ");
    return {
      quantity: i.quantity,
      price_data: {
        currency,
        unit_amount: i.unitPriceCents,
        product_data: { name: i.productName, ...(details && { description: details.slice(0, 480) }) },
      },
    };
  });
  if (order.shippingCents > 0) {
    lineItems.push({ quantity: 1, price_data: { currency, unit_amount: order.shippingCents, product_data: { name: "Envío a domicilio" } } });
  }
  if (order.taxCents > 0) {
    lineItems.push({ quantity: 1, price_data: { currency, unit_amount: order.taxCents, product_data: { name: "Impuestos" } } });
  }

  // Comprobación de integridad: la suma enviada a Stripe debe coincidir con el pedido.
  const sum = lineItems.reduce((s, li) => s + (li.price_data!.unit_amount ?? 0) * (li.quantity ?? 1), 0) - order.discountCents;
  if (sum !== order.totalCents) throw new AppError(500, "Inconsistencia en el total del pedido.", "TOTAL_MISMATCH");

  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  if (order.discountCents > 0) {
    const coupon = await stripe.coupons.create(
      {
        amount_off: order.discountCents,
        currency,
        duration: "once",
        max_redemptions: 1,
        name: order.couponCode ? `Cupón ${order.couponCode}` : "Descuento",
        metadata: { orderId: order.id },
      },
      { idempotencyKey: `mafer-coupon-${order.id}` },
    );
    discounts = [{ coupon: coupon.id }];
  }

  const number = orderNumber(order.number);
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60; // 60 min (Stripe exige ≥ 30 min)
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      locale: "es",
      line_items: lineItems,
      ...(discounts && { discounts }),
      customer_email: user.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id, orderNumber: number },
      payment_intent_data: { metadata: { orderId: order.id, orderNumber: number } },
      success_url: `${env.CLIENT_URL}/pago/exito?pedido=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CLIENT_URL}/pago/cancelado?pedido=${order.id}`,
      expires_at: expiresAt,
    },
    { idempotencyKey: `mafer-checkout-${order.id}-${order.payments.length}` },
  );

  if (session.amount_total != null && session.amount_total !== order.totalCents) {
    throw new AppError(500, "Stripe calculó un total distinto al del pedido.", "TOTAL_MISMATCH");
  }

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      stripeCheckoutSessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: new Date(expiresAt * 1000),
      amountCents: order.totalCents,
      currency,
      status: "PENDING",
    },
  });
  return { url: session.url!, paymentId: payment.id };
}

/** Marca el pago y el pedido como pagados (solo tras verificar con Stripe). Idempotente. */
async function markPaid(tx: Tx, session: Stripe.Checkout.Session) {
  const payment = await tx.payment.findUnique({ where: { stripeCheckoutSessionId: session.id }, include: { order: { include: { items: true } } } });
  if (!payment) {
    console.warn(`[stripe] Sesión ${session.id} sin pago registrado; se ignora.`);
    return;
  }
  if (payment.status === "PAID") return;

  if (session.amount_total !== payment.amountCents || session.currency !== payment.currency) {
    await audit({ action: "payment.amount_mismatch", entity: "Payment", entityId: payment.id, details: { stripeAmount: session.amount_total, expected: payment.amountCents } }, tx);
    throw new AppError(400, "El importe pagado no coincide con el pedido.", "AMOUNT_MISMATCH");
  }

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", stripePaymentIntentId: paymentIntentId } });

  const order = payment.order;
  if (order.status === "CANCELLED") {
    // Caso excepcional: llegó un pago a un pedido cancelado. Se registra para reembolso manual.
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", paidAt: new Date(), adminNotes: `${order.adminNotes ?? ""}\n[Sistema] Pago recibido en pedido cancelado: revisar y reembolsar.`.trim() },
    });
    await audit({ action: "order.paid_after_cancel", entity: "Order", entityId: order.id }, tx);
    return;
  }

  await tx.order.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID", status: order.status === "PENDING_PAYMENT" ? "CONFIRMED" : order.status, paidAt: new Date() },
  });
  for (const item of order.items) {
    if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { soldCount: { increment: item.quantity } } });
  }
  await audit({ action: "order.paid", entity: "Order", entityId: order.id, details: { sessionId: session.id } }, tx);
}

/** Pago fallido o sesión expirada: cancela el pedido pendiente y libera existencias. */
async function markUnpaid(tx: Tx, sessionId: string, status: "FAILED" | "CANCELLED", reason: string) {
  const payment = await tx.payment.findUnique({ where: { stripeCheckoutSessionId: sessionId }, include: { order: true } });
  if (!payment || payment.status === "PAID") return;
  await tx.payment.update({ where: { id: payment.id }, data: { status, checkoutUrl: null } });

  const order = payment.order;
  if (order.status !== "PENDING_PAYMENT" || order.paymentStatus === "PAID") return;
  const otherOpen = await tx.payment.count({ where: { orderId: order.id, status: "PENDING", id: { not: payment.id } } });
  if (otherOpen > 0) return;

  await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: status, cancelledAt: new Date() } });
  await releaseOrderHolds(tx, order.id, reason);
  await audit({ action: `order.${status.toLowerCase()}`, entity: "Order", entityId: order.id, details: { reason } }, tx);
}

async function applyChargeRefunded(tx: Tx, charge: Stripe.Charge) {
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return;
  const payment = await tx.payment.findUnique({ where: { stripePaymentIntentId: piId } });
  if (!payment) return;
  const refunded = Math.min(charge.amount_refunded, payment.amountCents);
  const status = refunded >= payment.amountCents ? "REFUNDED" : refunded > 0 ? "PARTIALLY_REFUNDED" : payment.status;
  await tx.payment.update({ where: { id: payment.id }, data: { refundedCents: refunded, status } });
  await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: status } });
  await tx.refund.updateMany({ where: { paymentId: payment.id, status: "PENDING" }, data: { status: "SUCCEEDED" } });
}

export const HANDLED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.payment_failed",
  "charge.refunded",
] as const;

/** Verifica la firma del webhook con el cuerpo original. Lanza 400 si no es válida. */
export function verifyWebhook(rawBody: Buffer, signature: string | undefined): Stripe.Event {
  const stripe = requireStripe();
  if (!env.STRIPE_WEBHOOK_SECRET) throw unavailable("Webhook de Stripe no configurado.");
  if (!signature) throw badRequest("Falta la firma de Stripe.");
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw badRequest("Firma de webhook no válida.");
  }
}

/**
 * Procesa un evento verificado dentro de una transacción.
 * El id del evento se registra en la misma transacción: si algo falla, se revierte
 * y Stripe reintenta; si ya se procesó, se ignora (tolerante a reintentos).
 */
export async function processEvent(event: Stripe.Event): Promise<"processed" | "duplicate" | "ignored"> {
  if (!(HANDLED_EVENTS as readonly string[]).includes(event.type)) return "ignored";
  try {
    await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({ data: { id: event.id, type: event.type } });
      switch (event.type) {
        case "checkout.session.completed": {
          const s = event.data.object as Stripe.Checkout.Session;
          // Con métodos asíncronos, payment_status puede ser "unpaid": se espera al evento final.
          if (s.payment_status === "paid" || s.payment_status === "no_payment_required") await markPaid(tx, s);
          break;
        }
        case "checkout.session.async_payment_succeeded":
          await markPaid(tx, event.data.object as Stripe.Checkout.Session);
          break;
        case "checkout.session.async_payment_failed":
          await markUnpaid(tx, (event.data.object as Stripe.Checkout.Session).id, "FAILED", "Pago asíncrono rechazado");
          break;
        case "checkout.session.expired":
          await markUnpaid(tx, (event.data.object as Stripe.Checkout.Session).id, "CANCELLED", "Sesión de pago expirada");
          break;
        case "payment_intent.payment_failed":
          // En Checkout el cliente puede reintentar con otra tarjeta dentro de la misma sesión;
          // el pedido se cancela solo si la sesión expira o el pago asíncrono falla.
          break;
        case "charge.refunded":
          await applyChargeRefunded(tx, event.data.object as Stripe.Charge);
          break;
      }
    });
    return "processed";
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return "duplicate";
    throw e;
  }
}

/**
 * Consulta el estado real de la sesión en Stripe (p. ej. al volver de Checkout).
 * Solo marca como pagado si Stripe confirma payment_status = "paid".
 */
export async function syncOrderPayment(userId: string, orderId: string) {
  const stripe = requireStripe();
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!order) throw notFound("Pedido no encontrado.");
  const payment = order.payments[0];
  if (payment && payment.status === "PENDING") {
    const session = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId);
    if (session.payment_status === "paid") await prisma.$transaction((tx) => markPaid(tx, session));
  }
  return prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { id: true, status: true, paymentStatus: true } });
}

export async function getMyPayment(userId: string, paymentId: string) {
  const p = await prisma.payment.findFirst({ where: { id: paymentId, order: { userId } } });
  if (!p) throw notFound("Pago no encontrado.");
  return { id: p.id, orderId: p.orderId, status: p.status, amountCents: p.amountCents, refundedCents: p.refundedCents, currency: p.currency, createdAt: p.createdAt };
}

/** Reembolso (total o parcial) iniciado por un administrador mediante la API de Stripe. */
export async function createRefund(adminId: string, paymentId: string, amountCents: number, reason?: string) {
  const stripe = requireStripe();
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw notFound("Pago no encontrado.");
  if (!["PAID", "PARTIALLY_REFUNDED"].includes(payment.status) || !payment.stripePaymentIntentId) {
    throw badRequest("Solo se pueden reembolsar pagos cobrados.");
  }
  const available = payment.amountCents - payment.refundedCents;
  if (amountCents > available) throw badRequest(`El máximo reembolsable es $${(available / 100).toFixed(2)}.`);

  const refund = await stripe.refunds.create(
    { payment_intent: payment.stripePaymentIntentId, amount: amountCents, reason: "requested_by_customer", metadata: { paymentId, adminId } },
    { idempotencyKey: `mafer-refund-${payment.id}-${payment.refundedCents}-${amountCents}` },
  );

  const status = refund.status === "succeeded" ? "SUCCEEDED" : refund.status === "failed" || refund.status === "canceled" ? "FAILED" : "PENDING";
  return prisma.$transaction(async (tx) => {
    const row = await tx.refund.upsert({
      where: { stripeRefundId: refund.id },
      update: { status },
      create: { paymentId, stripeRefundId: refund.id, amountCents, reason: reason ?? null, status, createdById: adminId },
    });
    if (status !== "FAILED") {
      const refunded = Math.min(payment.refundedCents + amountCents, payment.amountCents);
      const pStatus = refunded >= payment.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED";
      await tx.payment.update({ where: { id: paymentId }, data: { refundedCents: refunded, status: pStatus } });
      await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: pStatus } });
    }
    // Política: un reembolso NO devuelve existencias (el producto pudo prepararse o entregarse).
    await audit({ userId: adminId, action: "payment.refund", entity: "Payment", entityId: paymentId, details: { amountCents, stripeRefundId: refund.id, status } }, tx);
    return row;
  });
}

/** Cancela un pedido pendiente de pago por solicitud del cliente. */
export async function cancelPendingOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { payments: true } });
  if (!order) throw notFound("Pedido no encontrado.");
  if (order.status !== "PENDING_PAYMENT" || order.paymentStatus === "PAID") throw conflict("Este pedido ya no se puede cancelar desde tu cuenta. Contáctanos.");

  const stripe = getStripe();
  for (const p of order.payments.filter((p) => p.status === "PENDING")) {
    if (stripe) {
      const s = await stripe.checkout.sessions.retrieve(p.stripeCheckoutSessionId);
      if (s.payment_status === "paid") throw conflict("Este pedido ya fue pagado.");
      if (s.status === "open") await stripe.checkout.sessions.expire(p.stripeCheckoutSessionId);
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "CANCELLED", checkoutUrl: null } });
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", paymentStatus: "CANCELLED", cancelledAt: new Date() } });
    await releaseOrderHolds(tx, orderId, "Cancelado por el cliente");
    await audit({ userId, action: "order.cancelled_by_customer", entity: "Order", entityId: orderId }, tx);
  });
}
