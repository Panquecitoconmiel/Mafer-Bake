import request from "supertest";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/prisma.js";
import { app, createUser, futureDate, login, resetDb, seedCatalog } from "./helpers.js";

let fx: Awaited<ReturnType<typeof seedCatalog>>;

beforeEach(async () => {
  await resetDb();
  fx = await seedCatalog();
});

const cakeItem = (over: Record<string, unknown> = {}) => {
  const relleno = fx.cake.options.find((o) => o.name === "Relleno")!;
  const mensaje = fx.cake.options.find((o) => o.name === "Mensaje")!;
  const frambuesa = relleno.values.find((v) => v.label === "Frambuesa")!;
  const grande = fx.cake.variants.find((v) => v.name === "Grande")!;
  return { productId: fx.cake.id, variantId: grande.id, quantity: 1, selections: { [relleno.id]: frambuesa.id, [mensaje.id]: "Feliz día" }, ...over };
};

describe("catálogo", () => {
  it("solo muestra productos publicados y no expone existencias exactas", async () => {
    const res = await request(app).get("/api/v1/products");
    expect(res.status).toBe(200);
    expect(res.body.items.map((p: { slug: string }) => p.slug).sort()).toEqual(["galleta-de-prueba", "pastel-de-prueba"]);
    expect(res.body.items[0]).not.toHaveProperty("stock");
    expect((await request(app).get("/api/v1/products/borrador")).status).toBe(404);
  });

  it("filtra por búsqueda, categoría y precio", async () => {
    expect((await request(app).get("/api/v1/products?q=galleta")).body.total).toBe(1);
    expect((await request(app).get("/api/v1/products?category=pasteles")).body.total).toBe(2);
    expect((await request(app).get("/api/v1/products?maxPrice=100")).body.items[0].slug).toBe("galleta-de-prueba");
  });
});

describe("carrito", () => {
  it("calcula el precio en el servidor con variante y personalización", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/v1/cart/items").send(cakeItem());
    expect(res.status).toBe(201);
    // 500 + 300 (grande) + 60 (frambuesa) = $860
    expect(res.body.cart.items[0].unitPriceCents).toBe(86000);
    expect(res.body.cart.subtotalCents).toBe(86000);
    expect(res.body.cart.items[0].customizations).toEqual(
      expect.arrayContaining([expect.objectContaining({ optionName: "Mensaje", value: "Feliz día" })]),
    );
  });

  it("ignora cualquier precio enviado por el cliente", async () => {
    const res = await request(app).post("/api/v1/cart/items").send({ ...cakeItem(), unitPriceCents: 1 });
    expect(res.status).toBe(400); // el esquema es estricto: no acepta campos de precio
  });

  it("rechaza opciones obligatorias faltantes, opciones ajenas y textos largos", async () => {
    const relleno = fx.cake.options.find((o) => o.name === "Relleno")!;
    const mensaje = fx.cake.options.find((o) => o.name === "Mensaje")!;
    const base = cakeItem();
    expect((await request(app).post("/api/v1/cart/items").send({ ...base, selections: {} })).status).toBe(400);
    expect((await request(app).post("/api/v1/cart/items").send({ ...base, selections: { [relleno.id]: "valor-inexistente" } })).status).toBe(400);
    expect((await request(app).post("/api/v1/cart/items").send({ ...base, selections: { ...base.selections, [mensaje.id]: "x".repeat(50) } })).status).toBe(400);
  });

  it("agrupa artículos idénticos, cambia cantidades y elimina", async () => {
    const agent = request.agent(app);
    await agent.post("/api/v1/cart/items").send(cakeItem());
    const res = await agent.post("/api/v1/cart/items").send(cakeItem());
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].quantity).toBe(2);
    const id = res.body.cart.items[0].id;
    expect((await agent.patch(`/api/v1/cart/items/${id}`).send({ quantity: 3 })).body.cart.subtotalCents).toBe(86000 * 3);
    expect((await agent.delete(`/api/v1/cart/items/${id}`)).body.cart.items).toHaveLength(0);
  });

  it("no permite superar las existencias ni comprar borradores", async () => {
    expect((await request(app).post("/api/v1/cart/items").send({ productId: fx.cookie.id, quantity: 6, selections: {} })).status).toBe(400);
    expect((await request(app).post("/api/v1/cart/items").send({ productId: fx.draft.id, quantity: 1, selections: {} })).status).toBe(404);
  });

  it("refleja cambios de precio al volver a consultar el carrito", async () => {
    const agent = request.agent(app);
    await agent.post("/api/v1/cart/items").send({ productId: fx.cookie.id, quantity: 2, selections: {} });
    await prisma.product.update({ where: { id: fx.cookie.id }, data: { priceCents: 3000 } });
    expect((await agent.get("/api/v1/cart")).body.cart.subtotalCents).toBe(6000);
  });

  it("conserva el carrito de invitado al iniciar sesión", async () => {
    await createUser("ana@example.com");
    const agent = request.agent(app);
    await agent.post("/api/v1/cart/items").send({ productId: fx.cookie.id, quantity: 2, selections: {} });
    await agent.post("/api/v1/auth/login").send({ email: "ana@example.com", password: "secreto123" });
    expect((await agent.get("/api/v1/cart")).body.cart.itemCount).toBe(2);
  });
});

describe("pedidos", () => {
  async function customerWithCart(email = "ana@example.com") {
    await createUser(email);
    const agent = await login(email);
    await agent.post("/api/v1/cart/items").send({ productId: fx.cookie.id, quantity: 2, selections: {} });
    return agent;
  }
  const orderBody = (over: Record<string, unknown> = {}) => ({
    deliveryMethod: "PICKUP",
    requestedDate: futureDate(),
    slotId: fx.slot.id,
    acceptTerms: true,
    idempotencyKey: randomUUID(),
    expectedTotalCents: 5000,
    ...over,
  });

  it("crea el pedido, aparta inventario y vacía el carrito", async () => {
    const agent = await customerWithCart();
    const res = await agent.post("/api/v1/orders").send(orderBody());
    expect(res.status).toBe(201);
    expect(res.body.order.totalCents).toBe(5000);
    expect(res.body.order.status).toBe("PENDING_PAYMENT");
    expect(res.body.order.number).toMatch(/^MF-\d{6}$/);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: fx.cookie.id } })).stock).toBe(3);
    expect((await agent.get("/api/v1/cart")).body.cart.itemCount).toBe(0);
    const mv = await prisma.inventoryMovement.findFirstOrThrow({ where: { orderId: res.body.order.id } });
    expect(mv).toMatchObject({ type: "RESERVATION", quantity: -2, stockAfter: 3 });
  });

  it("es idempotente: la misma clave no duplica el pedido", async () => {
    const agent = await customerWithCart();
    const body = orderBody();
    const a = await agent.post("/api/v1/orders").send(body);
    const b = await agent.post("/api/v1/orders").send(body);
    expect(b.status).toBe(200);
    expect(b.body.order.id).toBe(a.body.order.id);
    expect(await prisma.order.count()).toBe(1);
  });

  it("avisa si el total cambió antes de cobrar", async () => {
    const agent = await customerWithCart();
    await prisma.product.update({ where: { id: fx.cookie.id }, data: { priceCents: 3000 } });
    const res = await agent.post("/api/v1/orders").send(orderBody());
    expect(res.status).toBe(409);
    expect(res.body.error.details).toMatchObject({ code: "PRICE_CHANGED", totalCents: 6000 });
    expect(await prisma.order.count()).toBe(0);
  });

  it("valida fecha, anticipación y cupo de la franja", async () => {
    const agent = await customerWithCart();
    expect((await agent.post("/api/v1/orders").send(orderBody({ requestedDate: "2020-01-01" }))).status).toBe(400);
    await prisma.blockedDate.create({ data: { date: new Date(`${futureDate()}T00:00:00Z`), reason: "Vacaciones" } });
    const blocked = await agent.post("/api/v1/orders").send(orderBody());
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.message).toContain("Vacaciones");
  });

  it("no permite vender más unidades de las disponibles entre clientes", async () => {
    const a = await customerWithCart("a@example.com");
    const b = await customerWithCart("b@example.com");
    await prisma.product.update({ where: { id: fx.cookie.id }, data: { stock: 3 } });
    const [ra, rb] = await Promise.all([
      a.post("/api/v1/orders").send(orderBody({ requestedDate: futureDate(6) })),
      b.post("/api/v1/orders").send(orderBody({ requestedDate: futureDate(7) })),
    ]);
    expect([ra.status, rb.status].sort()).toEqual([201, 409]);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: fx.cookie.id } })).stock).toBe(1);
  });

  it("aplica cupones válidos y respeta su límite de usos", async () => {
    await prisma.coupon.create({ data: { code: "DULCE10", type: "PERCENT", value: 10, maxUses: 1 } });
    const a = await customerWithCart("a@example.com");
    const quote = await a.post("/api/v1/orders/quote").send({ deliveryMethod: "PICKUP", couponCode: "dulce10" });
    expect(quote.body.quote).toMatchObject({ discountCents: 500, totalCents: 4500 });
    expect((await a.post("/api/v1/orders").send(orderBody({ couponCode: "DULCE10", expectedTotalCents: 4500 }))).status).toBe(201);

    const b = await customerWithCart("b@example.com");
    const q2 = await b.post("/api/v1/orders/quote").send({ deliveryMethod: "PICKUP", couponCode: "DULCE10" });
    expect(q2.body.quote.couponError).toMatch(/límite/);
    expect((await b.post("/api/v1/orders").send(orderBody({ couponCode: "DULCE10", expectedTotalCents: 4500 }))).status).toBe(400);
  });

  it("no permite consultar pedidos de otra persona", async () => {
    const a = await customerWithCart("a@example.com");
    const order = (await a.post("/api/v1/orders").send(orderBody())).body.order;
    await createUser("b@example.com");
    const b = await login("b@example.com");
    expect((await b.get(`/api/v1/orders/${order.id}`)).status).toBe(404);
    expect((await b.get("/api/v1/orders")).body.items).toHaveLength(0);
    expect((await b.post("/api/v1/payments/checkout-session").send({ orderId: order.id })).status).toBe(404);
  });

  it("el cliente puede cancelar un pedido pendiente y se liberan las existencias", async () => {
    const agent = await customerWithCart();
    const order = (await agent.post("/api/v1/orders").send(orderBody())).body.order;
    const res = await agent.post(`/api/v1/orders/${order.id}/cancel`);
    expect(res.body.order.status).toBe("CANCELLED");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: fx.cookie.id } })).stock).toBe(5);
  });

  it("la entrega a domicilio requiere configuración y dirección propia", async () => {
    const agent = await customerWithCart();
    expect((await agent.post("/api/v1/orders").send(orderBody({ deliveryMethod: "DELIVERY" }))).status).toBe(400);
    await prisma.storeSettings.update({ where: { id: 1 }, data: { deliveryEnabled: true, deliveryFeeCents: 8000 } });
    const q = await agent.post("/api/v1/orders/quote").send({ deliveryMethod: "DELIVERY" });
    expect(q.body.quote).toMatchObject({ shippingCents: 8000, totalCents: 13000 });
    expect((await agent.post("/api/v1/orders").send(orderBody({ deliveryMethod: "DELIVERY", expectedTotalCents: 13000 }))).status).toBe(400);
  });
});
