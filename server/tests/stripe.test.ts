import request from "supertest";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/prisma.js";
import { setStripeForTests } from "../src/config/stripe.js";
import { app, createUser, futureDate, login, resetDb, seedCatalog } from "./helpers.js";

const SECRET = "whsec_mafer_test_secret";
const real = new Stripe("sk_test_mafer_dummy");

// Doble de prueba del cliente de Stripe: registra las llamadas sin tocar la red.
const calls = { sessions: [] as Stripe.Checkout.SessionCreateParams[], refunds: [] as Stripe.RefundCreateParams[] };
let sessionSeq = 0;
const fake = {
  webhooks: real.webhooks,
  coupons: { create: vi.fn(async () => ({ id: "coupon_test" })) },
  checkout: {
    sessions: {
      create: vi.fn(async (params: Stripe.Checkout.SessionCreateParams) => {
        calls.sessions.push(params);
        const total = params.line_items!.reduce((s, li) => s + li.price_data!.unit_amount! * li.quantity!, 0);
        return { id: `cs_test_${++sessionSeq}`, url: `https://checkout.stripe.test/${sessionSeq}`, amount_total: total };
      }),
      retrieve: vi.fn(async (id: string) => ({ id, payment_status: "unpaid", status: "open" })),
      expire: vi.fn(async () => ({})),
    },
  },
  refunds: {
    create: vi.fn(async (params: Stripe.RefundCreateParams) => {
      calls.refunds.push(params);
      return { id: `re_test_${calls.refunds.length}`, status: "succeeded" };
    }),
  },
} as unknown as Stripe;

let fx: Awaited<ReturnType<typeof seedCatalog>>;

beforeEach(async () => {
  await resetDb();
  fx = await seedCatalog();
  calls.sessions.length = 0;
  calls.refunds.length = 0;
  sessionSeq = 0;
  setStripeForTests(fake);
});
afterAll(() => setStripeForTests(null));

async function pendingOrder() {
  await createUser("ana@example.com");
  const agent = await login("ana@example.com");
  await agent.post("/api/v1/cart/items").send({ productId: fx.cookie.id, quantity: 2, selections: {} });
  const order = (
    await agent.post("/api/v1/orders").send({
      deliveryMethod: "PICKUP", requestedDate: futureDate(), slotId: fx.slot.id, acceptTerms: true, idempotencyKey: randomUUID(), expectedTotalCents: 5000,
    })
  ).body.order;
  const checkout = await agent.post("/api/v1/payments/checkout-session").send({ orderId: order.id });
  return { agent, order, checkout };
}

function signed(event: object) {
  const payload = JSON.stringify(event);
  return { payload, header: real.webhooks.generateTestHeaderString({ payload, secret: SECRET }) };
}

function sendWebhook(event: object, header?: string) {
  const s = signed(event);
  return request(app).post("/api/v1/webhooks/stripe").set("Content-Type", "application/json").set("Stripe-Signature", header ?? s.header).send(s.payload);
}

const sessionEvent = (type: string, sessionId: string, extra: object = {}, id = `evt_${randomUUID()}`) => ({
  id,
  object: "event",
  type,
  data: { object: { id: sessionId, object: "checkout.session", amount_total: 5000, currency: "mxn", payment_status: "paid", payment_intent: "pi_test_1", ...extra } },
});

describe("Stripe Checkout", () => {
  it("crea la sesión con importes del servidor y la asocia al pedido", async () => {
    const { checkout, order } = await pendingOrder();
    expect(checkout.status).toBe(201);
    expect(checkout.body.url).toMatch(/^https:\/\/checkout\.stripe\.test/);
    const params = calls.sessions[0];
    expect(params.line_items).toEqual([expect.objectContaining({ quantity: 2, price_data: expect.objectContaining({ unit_amount: 2500, currency: "mxn" }) })]);
    expect(params.metadata).toMatchObject({ orderId: order.id });
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    expect(payment).toMatchObject({ status: "PENDING", amountCents: 5000, stripeCheckoutSessionId: "cs_test_1" });
  });

  it("reutiliza la sesión abierta para evitar cobros duplicados", async () => {
    const { agent, order, checkout } = await pendingOrder();
    const again = await agent.post("/api/v1/payments/checkout-session").send({ orderId: order.id });
    expect(again.body.url).toBe(checkout.body.url);
    expect(calls.sessions).toHaveLength(1);
  });

  it("no marca como pagado por visitar la página de éxito", async () => {
    const { agent, order } = await pendingOrder();
    const res = await agent.post(`/api/v1/payments/sync/${order.id}`);
    expect(res.body.order.paymentStatus).toBe("PENDING");
  });
});

describe("webhooks de Stripe", () => {
  it("rechaza firmas inválidas", async () => {
    const { order } = await pendingOrder();
    const bad = real.webhooks.generateTestHeaderString({ payload: "{}", secret: "whsec_otro" });
    const res = await sendWebhook(sessionEvent("checkout.session.completed", "cs_test_1"), bad);
    expect(res.status).toBe(400);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING");
  });

  it("confirma el pago y procesa cada evento una sola vez", async () => {
    const { order } = await pendingOrder();
    const event = sessionEvent("checkout.session.completed", "cs_test_1", {}, "evt_unico_1");
    expect((await sendWebhook(event)).body.result).toBe("processed");
    expect((await sendWebhook(event)).body.result).toBe("duplicate");

    const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(o).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: fx.cookie.id } })).soldCount).toBe(2);
  });

  it("mantiene pendiente un pago asíncrono hasta su confirmación", async () => {
    const { order } = await pendingOrder();
    await sendWebhook(sessionEvent("checkout.session.completed", "cs_test_1", { payment_status: "unpaid" }));
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING");
    await sendWebhook(sessionEvent("checkout.session.async_payment_succeeded", "cs_test_1"));
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PAID");
  });

  it("rechaza importes que no coinciden con el pedido", async () => {
    const { order } = await pendingOrder();
    const res = await sendWebhook(sessionEvent("checkout.session.completed", "cs_test_1", { amount_total: 100 }));
    expect(res.status).toBe(400);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING");
    expect(await prisma.webhookEvent.count()).toBe(0); // se revierte para permitir el reintento
  });

  it("al expirar o fallar el pago cancela el pedido y libera existencias", async () => {
    const { order } = await pendingOrder();
    expect((await prisma.product.findUniqueOrThrow({ where: { id: fx.cookie.id } })).stock).toBe(3);
    await sendWebhook(sessionEvent("checkout.session.expired", "cs_test_1", { payment_status: "unpaid" }));
    const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(o).toMatchObject({ status: "CANCELLED", paymentStatus: "CANCELLED", stockReleased: true });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: fx.cookie.id } })).stock).toBe(5);
  });
});

describe("reembolsos y administración de pagos", () => {
  async function paidOrder() {
    const ctx = await pendingOrder();
    await sendWebhook(sessionEvent("checkout.session.completed", "cs_test_1"));
    await createUser("admin@example.com", "ADMIN");
    const admin = await login("admin@example.com");
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: ctx.order.id } });
    return { ...ctx, admin, payment };
  }

  it("permite reembolsos parciales con confirmación y sin devolver inventario", async () => {
    const { admin, payment, order } = await paidOrder();
    expect((await admin.post(`/api/v1/admin/payments/${payment.id}/refunds`).send({ amountCents: 2000 })).status).toBe(400);
    const res = await admin.post(`/api/v1/admin/payments/${payment.id}/refunds`).send({ amountCents: 2000, confirm: true });
    expect(res.status).toBe(201);
    expect(calls.refunds[0]).toMatchObject({ payment_intent: "pi_test_1", amount: 2000 });
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ refundedCents: 2000, status: "PARTIALLY_REFUNDED" });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PARTIALLY_REFUNDED");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: fx.cookie.id } })).stock).toBe(3);
    expect((await admin.post(`/api/v1/admin/payments/${payment.id}/refunds`).send({ amountCents: 9999, confirm: true })).status).toBe(400);
  });

  it("los clientes no pueden reembolsar", async () => {
    const { agent, payment } = await paidOrder();
    expect((await agent.post(`/api/v1/admin/payments/${payment.id}/refunds`).send({ amountCents: 100, confirm: true })).status).toBe(403);
  });

  it("solo permite transiciones operativas válidas y nunca cambia el pago", async () => {
    const ctx = await pendingOrder();
    await createUser("admin@example.com", "ADMIN");
    const admin = await login("admin@example.com");
    const skip = await admin.patch(`/api/v1/admin/orders/${ctx.order.id}/status`).send({ status: "IN_PREPARATION" });
    expect(skip.status).toBe(400);
    const forge = await admin.patch(`/api/v1/admin/orders/${ctx.order.id}/status`).send({ status: "IN_PREPARATION", paymentStatus: "PAID" });
    expect(forge.status).toBe(400);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: ctx.order.id } })).paymentStatus).toBe("PENDING");
  });

  it("registra quién cambió el estado del pedido", async () => {
    const { admin, order } = await paidOrder();
    const res = await admin.patch(`/api/v1/admin/orders/${order.id}/status`).send({ status: "IN_PREPARATION" });
    expect(res.status).toBe(200);
    expect(res.body.order.history.at(-1)).toMatchObject({ action: "order.status", by: "Ana Prueba" });
    const dash = await admin.get("/api/v1/admin/dashboard");
    expect(dash.body).toMatchObject({ salesTodayCents: 5000, inPreparation: 1 });
  });
});
