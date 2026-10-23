import type { OrderStatus, Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../config/prisma.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { orderNumber, parseDateOnly, slugify, toDateOnly } from "../utils/format.js";
import type * as V from "../validators/admin.validators.js";
import { audit } from "./audit.service.js";
import { orderDetailInclude, releaseOrderHolds, serializeOrder, slotLabels } from "./order.service.js";
import { storeLocalToUtc, storeToday } from "./settings.service.js";

// ─────────────── Dashboard ───────────────

export async function dashboard() {
  const today = storeToday();
  const startToday = storeLocalToUtc(today, "00:00");
  const startMonth = storeLocalToUtc(`${today.slice(0, 7)}-01`, "00:00");
  const start14 = new Date(startToday.getTime() - 13 * 86_400_000);

  const paidWhere = (from: Date): Prisma.OrderWhereInput => ({ paidAt: { gte: from }, paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } });

  const [salesToday, salesMonth, collected, refunded, newOrders, pendingPay, inPrep, ready, lowStock, top, recent, series] = await Promise.all([
    prisma.order.aggregate({ where: paidWhere(startToday), _sum: { totalCents: true }, _count: true }),
    prisma.order.aggregate({ where: paidWhere(startMonth), _sum: { totalCents: true }, _count: true }),
    prisma.payment.aggregate({ where: { status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] }, updatedAt: { gte: startMonth } }, _sum: { amountCents: true } }),
    prisma.refund.aggregate({ where: { status: "SUCCEEDED", createdAt: { gte: startMonth } }, _sum: { amountCents: true } }),
    prisma.order.count({ where: { createdAt: { gte: startToday } } }),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { status: { in: ["CONFIRMED", "IN_PREPARATION"] } } }),
    prisma.order.count({ where: { status: "READY" } }),
    prisma.$queryRaw<{ id: string; name: string; stock: number; lowStockThreshold: number }[]>`
      SELECT id, name, stock, "lowStockThreshold" FROM "Product"
      WHERE "inventoryMode" = 'TRACKED' AND status <> 'ARCHIVED' AND stock <= "lowStockThreshold"
      ORDER BY stock ASC LIMIT 10`,
    prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      where: { order: { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] }, paidAt: { gte: startMonth } } },
      _sum: { quantity: true, lineTotalCents: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { firstName: true, lastName: true } } } }),
    prisma.order.findMany({ where: paidWhere(start14), select: { paidAt: true, totalCents: true } }),
  ]);

  const byDay = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(startToday.getTime() - (13 - i) * 86_400_000 + 12 * 3_600_000);
    byDay.set(storeToday(d), 0);
  }
  for (const o of series) {
    const key = storeToday(o.paidAt!);
    if (byDay.has(key)) byDay.set(key, byDay.get(key)! + o.totalCents);
  }

  return {
    salesTodayCents: salesToday._sum.totalCents ?? 0,
    ordersPaidToday: salesToday._count,
    salesMonthCents: salesMonth._sum.totalCents ?? 0,
    ordersPaidMonth: salesMonth._count,
    collectedMonthCents: collected._sum.amountCents ?? 0,
    refundedMonthCents: refunded._sum.amountCents ?? 0,
    newOrdersToday: newOrders,
    pendingPayment: pendingPay,
    inPreparation: inPrep,
    readyForDelivery: ready,
    lowStock,
    topProducts: top.map((t) => ({ productId: t.productId, name: t.productName, quantity: t._sum.quantity ?? 0, revenueCents: t._sum.lineTotalCents ?? 0 })),
    salesSeries: [...byDay.entries()].map(([date, cents]) => ({ date, cents })),
    recentOrders: recent.map((o) => ({
      id: o.id,
      number: orderNumber(o.number),
      customer: `${o.user.firstName} ${o.user.lastName}`,
      totalCents: o.totalCents,
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    })),
  };
}

// ─────────────── Categorías ───────────────

export async function listCategoriesAdmin() {
  return prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
}

export async function saveCategory(adminId: string, data: z.infer<typeof V.categorySchema>, id?: string) {
  const payload = { ...data, slug: data.slug || slugify(data.name) };
  const cat = id ? await prisma.category.update({ where: { id }, data: payload }) : await prisma.category.create({ data: payload });
  await audit({ userId: adminId, action: id ? "category.update" : "category.create", entity: "Category", entityId: cat.id, details: { name: cat.name } });
  return cat;
}

export async function deleteCategory(adminId: string, id: string) {
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) throw conflict("La categoría tiene productos. Muévelos o desactiva la categoría.");
  await prisma.category.delete({ where: { id } });
  await audit({ userId: adminId, action: "category.delete", entity: "Category", entityId: id });
}

// ─────────────── Productos ───────────────

const adminProductInclude = {
  category: { select: { id: true, name: true } },
  images: { orderBy: { sortOrder: "asc" } },
  variants: { orderBy: { sortOrder: "asc" } },
  options: { orderBy: { sortOrder: "asc" }, include: { values: { orderBy: { sortOrder: "asc" } } } },
} satisfies Prisma.ProductInclude;

export async function listProductsAdmin(q: z.infer<typeof V.listQuerySchema> & { category?: string }) {
  const where: Prisma.ProductWhereInput = {
    ...(q.q && { name: { contains: q.q, mode: "insensitive" } }),
    ...(q.status && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(q.status) && { status: q.status as "DRAFT" }),
    ...(q.category && { categoryId: q.category }),
  };
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { category: { select: { name: true } }, images: { take: 1, orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export async function getProductAdmin(id: string) {
  const p = await prisma.product.findUnique({ where: { id }, include: adminProductInclude });
  if (!p) throw notFound("Producto no encontrado.");
  return p;
}

/**
 * Crea o actualiza un producto con imágenes, variantes y opciones.
 * Las variantes/opciones existentes se actualizan por id; las que ya no vienen se eliminan
 * (los pedidos conservan su propia copia de nombre, precio y personalización).
 */
export async function saveProduct(adminId: string, data: z.infer<typeof V.productSchema>, id?: string) {
  const { images, variants, options, ...fields } = data;
  const slug = fields.slug || slugify(fields.name);
  const category = await prisma.category.findUnique({ where: { id: fields.categoryId } });
  if (!category) throw badRequest("La categoría no existe.");

  const product = await prisma.$transaction(async (tx) => {
    const base = { ...fields, slug, salePriceCents: fields.salePriceCents ?? null };
    const p = id ? await tx.product.update({ where: { id }, data: base }) : await tx.product.create({ data: base });

    await tx.productImage.deleteMany({ where: { productId: p.id } });
    if (images.length) await tx.productImage.createMany({ data: images.map((img, i) => ({ productId: p.id, url: img.url, alt: img.alt, sortOrder: i })) });

    const existingVariants = await tx.productVariant.findMany({ where: { productId: p.id } });
    const keepV = new Set(variants.filter((v) => v.id).map((v) => v.id!));
    await tx.productVariant.deleteMany({ where: { productId: p.id, id: { notIn: [...keepV] } } });
    for (const [i, v] of variants.entries()) {
      const d = { name: v.name, priceDeltaCents: v.priceDeltaCents, isActive: v.isActive, sortOrder: i };
      if (v.id && existingVariants.some((e) => e.id === v.id)) await tx.productVariant.update({ where: { id: v.id }, data: d });
      else await tx.productVariant.create({ data: { ...d, productId: p.id } });
    }

    const existingOptions = await tx.productOption.findMany({ where: { productId: p.id }, include: { values: true } });
    const keepO = new Set(options.filter((o) => o.id).map((o) => o.id!));
    await tx.productOption.deleteMany({ where: { productId: p.id, id: { notIn: [...keepO] } } });
    for (const [i, o] of options.entries()) {
      if (o.type !== "TEXT" && o.values.length === 0) throw badRequest(`La opción «${o.name}» necesita al menos un valor.`);
      const d = { name: o.name, type: o.type, isRequired: o.isRequired, isActive: o.isActive, maxLength: o.type === "TEXT" ? (o.maxLength ?? 120) : null, sortOrder: i };
      const prev = o.id ? existingOptions.find((e) => e.id === o.id) : undefined;
      const opt = prev ? await tx.productOption.update({ where: { id: prev.id }, data: d }) : await tx.productOption.create({ data: { ...d, productId: p.id } });
      const keepVals = new Set(o.values.filter((v) => v.id).map((v) => v.id!));
      await tx.productOptionValue.deleteMany({ where: { optionId: opt.id, id: { notIn: [...keepVals] } } });
      for (const [j, v] of o.values.entries()) {
        const vd = { label: v.label, priceDeltaCents: v.priceDeltaCents, isActive: v.isActive, sortOrder: j };
        if (v.id && prev?.values.some((x) => x.id === v.id)) await tx.productOptionValue.update({ where: { id: v.id }, data: vd });
        else await tx.productOptionValue.create({ data: { ...vd, optionId: opt.id } });
      }
    }

    await audit({ userId: adminId, action: id ? "product.update" : "product.create", entity: "Product", entityId: p.id, details: { name: p.name, priceCents: p.priceCents, salePriceCents: p.salePriceCents, status: p.status } }, tx);
    return p;
  });
  return getProductAdmin(product.id);
}

export async function setProductStatus(adminId: string, id: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const p = await prisma.product.update({ where: { id }, data: { status } });
  await audit({ userId: adminId, action: "product.status", entity: "Product", entityId: id, details: { status } });
  return p;
}

/** Elimina solo si no tiene pedidos; de lo contrario se archiva para conservar el historial. */
export async function deleteProduct(adminId: string, id: string) {
  const orders = await prisma.orderItem.count({ where: { productId: id } });
  if (orders > 0) {
    await setProductStatus(adminId, id, "ARCHIVED");
    return { archived: true };
  }
  await prisma.product.delete({ where: { id } });
  await audit({ userId: adminId, action: "product.delete", entity: "Product", entityId: id });
  return { archived: false };
}

// ─────────────── Inventario ───────────────

export async function listInventory() {
  return prisma.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: [{ inventoryMode: "asc" }, { name: "asc" }],
    select: { id: true, name: true, inventoryMode: true, stock: true, lowStockThreshold: true, status: true, isAvailable: true },
  });
}

export async function adjustInventory(adminId: string, productId: string, input: z.infer<typeof V.inventoryAdjustSchema>) {
  const qty = input.type === "IN" ? Math.abs(input.quantity) : input.type === "OUT" ? -Math.abs(input.quantity) : input.quantity;
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw notFound("Producto no encontrado.");
    if (product.inventoryMode !== "TRACKED") throw badRequest("Este producto se prepara bajo pedido; no maneja existencias.");
    const { count } = await tx.product.updateMany({
      where: { id: productId, ...(qty < 0 && { stock: { gte: -qty } }) },
      data: { stock: { increment: qty } },
    });
    if (count === 0) throw badRequest("El inventario no puede quedar en negativo.");
    const updated = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    const mv = await tx.inventoryMovement.create({ data: { productId, type: input.type, quantity: qty, stockAfter: updated.stock, reason: input.reason, userId: adminId } });
    await audit({ userId: adminId, action: "inventory.adjust", entity: "Product", entityId: productId, details: { type: input.type, quantity: qty, reason: input.reason } }, tx);
    return { stock: updated.stock, movement: mv };
  });
}

export async function listMovements(productId?: string) {
  return prisma.inventoryMovement.findMany({
    where: productId ? { productId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: { select: { name: true } }, user: { select: { firstName: true, lastName: true } }, order: { select: { number: true } } },
  });
}

// ─────────────── Pedidos ───────────────

export async function listOrdersAdmin(q: z.infer<typeof V.listQuerySchema> & { payment?: string }) {
  const num = q.q?.replace(/^MF-?/i, "");
  const where: Prisma.OrderWhereInput = {
    ...(q.status && { status: q.status as OrderStatus }),
    ...(q.payment && { paymentStatus: q.payment as "PAID" }),
    ...(q.q && {
      OR: [
        ...(num && /^\d+$/.test(num) ? [{ number: Number(num) }] : []),
        { user: { email: { contains: q.q, mode: "insensitive" as const } } },
        { user: { lastName: { contains: q.q, mode: "insensitive" as const } } },
      ],
    }),
  };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { user: { select: { firstName: true, lastName: true, email: true } }, _count: { select: { items: true } } },
    }),
  ]);
  const labels = await slotLabels(orders.map((o) => o.requestedSlot));
  return {
    items: orders.map((o) => ({
      id: o.id,
      number: orderNumber(o.number),
      customer: { name: `${o.user.firstName} ${o.user.lastName}`, email: o.user.email },
      itemCount: o._count.items,
      totalCents: o.totalCents,
      status: o.status,
      paymentStatus: o.paymentStatus,
      deliveryMethod: o.deliveryMethod,
      requestedDate: toDateOnly(o.requestedDate),
      requestedSlot: labels.get(o.requestedSlot) ?? "",
      createdAt: o.createdAt,
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}

export async function getOrderAdmin(id: string) {
  const o = await prisma.order.findUnique({
    where: { id },
    include: { ...orderDetailInclude, user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
  });
  if (!o) throw notFound("Pedido no encontrado.");
  const [labels, history] = await Promise.all([
    slotLabels([o.requestedSlot]),
    prisma.auditLog.findMany({ where: { entity: "Order", entityId: id }, orderBy: { createdAt: "asc" }, include: { user: { select: { firstName: true, lastName: true } } } }),
  ]);
  return {
    ...serializeOrder(o, labels.get(o.requestedSlot)),
    adminNotes: o.adminNotes,
    customer: o.user,
    payments: o.payments.map((p) => ({
      id: p.id,
      status: p.status,
      amountCents: p.amountCents,
      refundedCents: p.refundedCents,
      currency: p.currency,
      stripeCheckoutSessionId: p.stripeCheckoutSessionId,
      stripePaymentIntentId: p.stripePaymentIntentId,
      createdAt: p.createdAt,
      refunds: p.refunds,
    })),
    history: history.map((h) => ({ action: h.action, details: h.details, createdAt: h.createdAt, by: h.user ? `${h.user.firstName} ${h.user.lastName}` : "Sistema" })),
  };
}

/** Transiciones operativas permitidas. El estado de pago NUNCA se cambia desde aquí. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  CONFIRMED: ["IN_PREPARATION", "CANCELLED"],
  IN_PREPARATION: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "READY"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function updateOrderStatus(adminId: string, id: string, input: z.infer<typeof V.orderStatusSchema>) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) throw notFound("Pedido no encontrado.");
    if (!ORDER_TRANSITIONS[order.status].includes(input.status)) {
      throw badRequest(`No se puede pasar de ${order.status} a ${input.status}.`);
    }
    if (input.status === "OUT_FOR_DELIVERY" && order.deliveryMethod !== "DELIVERY") throw badRequest("El pedido es para recoger en tienda.");

    const updated = await tx.order.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.confirmedDate && { confirmedDate: parseDateOnly(input.confirmedDate) }),
        ...(input.status === "CANCELLED" && { cancelledAt: new Date() }),
        ...(input.status === "CANCELLED" && order.paymentStatus === "PENDING" && { paymentStatus: "CANCELLED" }),
      },
    });
    // Al cancelar antes de preparar se devuelven las existencias apartadas.
    if (input.status === "CANCELLED" && ["PENDING_PAYMENT", "CONFIRMED"].includes(order.status)) {
      await releaseOrderHolds(tx, id, "Cancelado por administración");
    }
    await audit({ userId: adminId, action: "order.status", entity: "Order", entityId: id, details: { from: order.status, to: input.status, note: input.note ?? null } }, tx);
    return updated;
  });
}

export async function updateOrderNotes(adminId: string, id: string, adminNotes: string) {
  await prisma.order.update({ where: { id }, data: { adminNotes } });
  await audit({ userId: adminId, action: "order.notes", entity: "Order", entityId: id });
}

// ─────────────── Clientes ───────────────

export async function listCustomers(q: z.infer<typeof V.listQuerySchema>) {
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q.q && {
      OR: [
        { email: { contains: q.q, mode: "insensitive" } },
        { firstName: { contains: q.q, mode: "insensitive" } },
        { lastName: { contains: q.q, mode: "insensitive" } },
      ],
    }),
  };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, isActive: true, emailVerifiedAt: true, createdAt: true, _count: { select: { orders: true } } },
    }),
  ]);
  return { items: users, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export async function getCustomer(id: string) {
  const u = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true, isActive: true, emailVerifiedAt: true, createdAt: true,
      addresses: true,
      orders: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, number: true, totalCents: true, status: true, paymentStatus: true, createdAt: true } },
    },
  });
  if (!u) throw notFound("Cliente no encontrado.");
  return { ...u, orders: u.orders.map((o) => ({ ...o, number: orderNumber(o.number) })) };
}

export async function setCustomerActive(adminId: string, id: string, isActive: boolean) {
  const u = await prisma.user.findFirst({ where: { id, role: "CUSTOMER" } });
  if (!u) throw notFound("Cliente no encontrado.");
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { isActive } }),
    ...(isActive ? [] : [prisma.session.deleteMany({ where: { userId: id } })]),
  ]);
  await audit({ userId: adminId, action: isActive ? "customer.activate" : "customer.deactivate", entity: "User", entityId: id });
}

// ─────────────── Pagos ───────────────

export async function listPayments(q: z.infer<typeof V.listQuerySchema>) {
  const where: Prisma.PaymentWhereInput = q.status ? { status: q.status as "PAID" } : {};
  const [total, items] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { order: { select: { id: true, number: true, user: { select: { firstName: true, lastName: true } } } }, refunds: true },
    }),
  ]);
  return {
    items: items.map((p) => ({
      id: p.id,
      orderId: p.order.id,
      orderNumber: orderNumber(p.order.number),
      customer: `${p.order.user.firstName} ${p.order.user.lastName}`,
      amountCents: p.amountCents,
      refundedCents: p.refundedCents,
      currency: p.currency,
      status: p.status,
      stripeRef: p.stripePaymentIntentId ?? p.stripeCheckoutSessionId,
      createdAt: p.createdAt,
      refunds: p.refunds.map((r) => ({ id: r.id, amountCents: r.amountCents, status: r.status, reason: r.reason, createdAt: r.createdAt })),
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}

// ─────────────── Cupones ───────────────

export async function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export async function saveCoupon(adminId: string, data: z.infer<typeof V.couponSchema>, id?: string) {
  const payload = {
    ...data,
    startsAt: data.startsAt ? new Date(data.startsAt) : null,
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
  };
  const c = id ? await prisma.coupon.update({ where: { id }, data: payload }) : await prisma.coupon.create({ data: payload });
  await audit({ userId: adminId, action: id ? "coupon.update" : "coupon.create", entity: "Coupon", entityId: c.id, details: { code: c.code } });
  return c;
}

// ─────────────── Configuración ───────────────

export async function saveSettings(adminId: string, data: z.infer<typeof V.settingsSchema>) {
  const s = await prisma.storeSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  await audit({ userId: adminId, action: "settings.update", entity: "StoreSettings", entityId: "1" });
  return s;
}

export async function listAudit() {
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { firstName: true, lastName: true } } } });
}
