import type { Request, Response } from "express";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../config/prisma.js";
import * as admin from "../services/admin.service.js";
import { createRefund } from "../services/payment.service.js";
import { getSettings } from "../services/settings.service.js";
import { randomToken } from "../utils/crypto.js";
import { badRequest } from "../utils/errors.js";
import { parseDateOnly } from "../utils/format.js";
import * as V from "../validators/admin.validators.js";

const uid = (req: Request) => req.user!.id;
const id = (req: Request) => String(req.params.id);

export const dashboard = async (_req: Request, res: Response) => res.json(await admin.dashboard());

// Categorías
export const listCategories = async (_req: Request, res: Response) => res.json({ items: await admin.listCategoriesAdmin() });
export const createCategory = async (req: Request, res: Response) => res.status(201).json({ category: await admin.saveCategory(uid(req), V.categorySchema.parse(req.body)) });
export const updateCategory = async (req: Request, res: Response) => res.json({ category: await admin.saveCategory(uid(req), V.categorySchema.parse(req.body), id(req)) });
export async function deleteCategory(req: Request, res: Response) {
  await admin.deleteCategory(uid(req), id(req));
  res.json({ ok: true });
}

// Productos
export async function listProducts(req: Request, res: Response) {
  const q = V.listQuerySchema.parse(req.query);
  res.json(await admin.listProductsAdmin({ ...q, category: req.query.category ? String(req.query.category) : undefined }));
}
export const getProduct = async (req: Request, res: Response) => res.json({ product: await admin.getProductAdmin(id(req)) });
export const createProduct = async (req: Request, res: Response) => res.status(201).json({ product: await admin.saveProduct(uid(req), V.productSchema.parse(req.body)) });
export const updateProduct = async (req: Request, res: Response) => res.json({ product: await admin.saveProduct(uid(req), V.productSchema.parse(req.body), id(req)) });
export const setProductStatus = async (req: Request, res: Response) =>
  res.json({ product: await admin.setProductStatus(uid(req), id(req), V.productStatusSchema.parse(req.body).status) });
export const deleteProduct = async (req: Request, res: Response) => res.json(await admin.deleteProduct(uid(req), id(req)));

// Inventario
export const listInventory = async (_req: Request, res: Response) => res.json({ items: await admin.listInventory() });
export const adjustInventory = async (req: Request, res: Response) => res.json(await admin.adjustInventory(uid(req), id(req), V.inventoryAdjustSchema.parse(req.body)));
export const listMovements = async (req: Request, res: Response) =>
  res.json({ items: await admin.listMovements(req.query.productId ? String(req.query.productId) : undefined) });

// Pedidos
export async function listOrders(req: Request, res: Response) {
  const q = V.listQuerySchema.parse(req.query);
  res.json(await admin.listOrdersAdmin({ ...q, payment: req.query.payment ? String(req.query.payment) : undefined }));
}
export const getOrder = async (req: Request, res: Response) => res.json({ order: await admin.getOrderAdmin(id(req)) });
export async function updateOrderStatus(req: Request, res: Response) {
  await admin.updateOrderStatus(uid(req), id(req), V.orderStatusSchema.parse(req.body));
  res.json({ order: await admin.getOrderAdmin(id(req)) });
}
export async function updateOrderNotes(req: Request, res: Response) {
  await admin.updateOrderNotes(uid(req), id(req), V.orderNotesSchema.parse(req.body).adminNotes);
  res.json({ ok: true });
}

// Clientes
export const listCustomers = async (req: Request, res: Response) => res.json(await admin.listCustomers(V.listQuerySchema.parse(req.query)));
export const getCustomer = async (req: Request, res: Response) => res.json({ customer: await admin.getCustomer(id(req)) });
export async function setCustomerActive(req: Request, res: Response) {
  if (typeof req.body?.isActive !== "boolean") throw badRequest("Indica isActive.");
  await admin.setCustomerActive(uid(req), id(req), req.body.isActive);
  res.json({ ok: true });
}

// Pagos
export const listPayments = async (req: Request, res: Response) => res.json(await admin.listPayments(V.listQuerySchema.parse(req.query)));
export async function refundPayment(req: Request, res: Response) {
  const { amountCents, reason } = V.refundSchema.parse(req.body);
  res.status(201).json({ refund: await createRefund(uid(req), id(req), amountCents, reason) });
}

// Cupones
export const listCoupons = async (_req: Request, res: Response) => res.json({ items: await admin.listCoupons() });
export const createCoupon = async (req: Request, res: Response) => res.status(201).json({ coupon: await admin.saveCoupon(uid(req), V.couponSchema.parse(req.body)) });
export const updateCoupon = async (req: Request, res: Response) => res.json({ coupon: await admin.saveCoupon(uid(req), V.couponSchema.parse(req.body), id(req)) });

// Configuración y entregas
export const getSettingsAdmin = async (_req: Request, res: Response) => res.json({ settings: await getSettings() });
export const saveSettings = async (req: Request, res: Response) => res.json({ settings: await admin.saveSettings(uid(req), V.settingsSchema.parse(req.body)) });
export const listSlots = async (_req: Request, res: Response) =>
  res.json({
    slots: await prisma.deliverySlot.findMany({ orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] }),
    blockedDates: await prisma.blockedDate.findMany({ orderBy: { date: "asc" }, where: { date: { gte: new Date(Date.now() - 86_400_000) } } }),
  });
export const createSlot = async (req: Request, res: Response) => res.status(201).json({ slot: await prisma.deliverySlot.create({ data: V.slotSchema.parse(req.body) }) });
export const updateSlot = async (req: Request, res: Response) => res.json({ slot: await prisma.deliverySlot.update({ where: { id: id(req) }, data: V.slotSchema.parse(req.body) }) });
export async function addBlockedDate(req: Request, res: Response) {
  const d = V.blockedDateSchema.parse(req.body);
  res.status(201).json({ blockedDate: await prisma.blockedDate.create({ data: { date: parseDateOnly(d.date), reason: d.reason ?? null } }) });
}
export async function removeBlockedDate(req: Request, res: Response) {
  await prisma.blockedDate.delete({ where: { id: id(req) } });
  res.json({ ok: true });
}

export const listAudit = async (_req: Request, res: Response) => res.json({ items: await admin.listAudit() });

// Subida de imágenes: se valida la firma real del archivo, no solo la extensión.
export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const SIGNATURES: { ext: string; test: (b: Buffer) => boolean }[] = [
  { ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

export async function uploadImage(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw badRequest("Adjunta una imagen.");
  const sig = SIGNATURES.find((s) => s.test(file.buffer));
  if (!sig) throw badRequest("Formato no permitido. Usa JPG, PNG o WEBP.");
  const name = `${Date.now()}-${randomToken(8)}.${sig.ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), file.buffer);
  res.status(201).json({ url: `/uploads/${name}` });
}
