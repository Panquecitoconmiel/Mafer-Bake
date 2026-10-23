import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import * as cart from "../services/cart.service.js";
import * as catalog from "../services/catalog.service.js";
import * as orders from "../services/order.service.js";
import * as payments from "../services/payment.service.js";
import { getSettings, publicSettings, slotsForDate } from "../services/settings.service.js";
import { badRequest } from "../utils/errors.js";
import * as V from "../validators/shop.validators.js";

// ─── Catálogo ───

export async function listProducts(req: Request, res: Response) {
  res.json(await catalog.listProducts(V.productQuerySchema.parse(req.query)));
}

export async function getProduct(req: Request, res: Response) {
  res.json({ product: await catalog.getProductBySlug(String(req.params.slug)) });
}

export async function listCategories(_req: Request, res: Response) {
  res.json({ items: await catalog.listCategories() });
}

export async function storeInfo(_req: Request, res: Response) {
  res.json({ settings: publicSettings(await getSettings()) });
}

export async function availability(req: Request, res: Response) {
  const date = String(req.query.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badRequest("Indica una fecha válida (AAAA-MM-DD).");
  const settings = await getSettings();
  // El tiempo de anticipación considera el producto más tardado del carrito.
  const c = await cart.resolveCart(req, res, false);
  const view = await cart.getCartView(c?.id ?? null);
  const lead = Math.max(settings.minLeadHours, view.maxPrepTimeHours);
  res.json({ ...(await slotsForDate(date, lead)), leadHours: lead });
}

// ─── Carrito ───

export async function getCart(req: Request, res: Response) {
  const c = await cart.resolveCart(req, res, false);
  res.json({ cart: cart.serializeCart(await cart.getCartView(c?.id ?? null)) });
}

export async function addCartItem(req: Request, res: Response) {
  const data = V.addCartItemSchema.parse(req.body);
  const c = (await cart.resolveCart(req, res, true))!;
  await cart.addItem(c.id, data);
  res.status(201).json({ cart: cart.serializeCart(await cart.getCartView(c.id)) });
}

export async function updateCartItem(req: Request, res: Response) {
  const { quantity } = V.updateCartItemSchema.parse(req.body);
  const c = await cart.resolveCart(req, res, false);
  if (!c) throw badRequest("Tu carrito está vacío.");
  await cart.updateItem(c.id, String(req.params.id), quantity);
  res.json({ cart: cart.serializeCart(await cart.getCartView(c.id)) });
}

export async function removeCartItem(req: Request, res: Response) {
  const c = await cart.resolveCart(req, res, false);
  if (!c) throw badRequest("Tu carrito está vacío.");
  await cart.removeItem(c.id, String(req.params.id));
  res.json({ cart: cart.serializeCart(await cart.getCartView(c.id)) });
}

// ─── Pedidos ───

export async function quoteOrder(req: Request, res: Response) {
  const input = V.quoteSchema.parse(req.body);
  const c = await cart.resolveCart(req, res, false);
  res.json({ quote: await orders.quote(req.user!.id, c?.id ?? null, input) });
}

export async function createOrder(req: Request, res: Response) {
  const input = V.createOrderSchema.parse(req.body);
  const c = await cart.resolveCart(req, res, false);
  const { order, reused } = await orders.createOrder(req.user!.id, c?.id ?? null, input);
  res.status(reused ? 200 : 201).json({ order: await orders.getMyOrder(req.user!.id, order.id) });
}

export async function listOrders(req: Request, res: Response) {
  res.json({ items: await orders.listMyOrders(req.user!.id) });
}

export async function getOrder(req: Request, res: Response) {
  res.json({ order: await orders.getMyOrder(req.user!.id, String(req.params.id)) });
}

export async function cancelOrder(req: Request, res: Response) {
  await payments.cancelPendingOrder(req.user!.id, String(req.params.id));
  res.json({ order: await orders.getMyOrder(req.user!.id, String(req.params.id)) });
}

// ─── Pagos ───

export async function createCheckoutSession(req: Request, res: Response) {
  const { orderId } = V.checkoutSessionSchema.parse(req.body);
  res.status(201).json(await payments.createCheckoutSession(req.user!, orderId));
}

export async function syncOrderPayment(req: Request, res: Response) {
  res.json({ order: await payments.syncOrderPayment(req.user!.id, String(req.params.orderId)) });
}

export async function getPayment(req: Request, res: Response) {
  res.json({ payment: await payments.getMyPayment(req.user!.id, String(req.params.id)) });
}

export async function stripeWebhook(req: Request, res: Response) {
  const event = payments.verifyWebhook(req.body as Buffer, req.get("stripe-signature"));
  const result = await payments.processEvent(event);
  res.json({ received: true, result });
}

export async function health(_req: Request, res: Response) {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
}
