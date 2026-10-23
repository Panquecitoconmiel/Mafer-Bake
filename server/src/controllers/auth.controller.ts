import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { SESSION_COOKIE, sessionCookieOptions } from "../middleware/auth.js";
import * as auth from "../services/auth.service.js";
import { mergeGuestCart } from "../services/cart.service.js";
import { badRequest } from "../utils/errors.js";
import * as V from "../validators/auth.validators.js";

async function startSession(req: Request, res: Response, userId: string) {
  // Rota la sesión: invalida la anterior si existía (evita fijación de sesión).
  await auth.logout(req.sessionId);
  const token = await auth.createSession(userId, req.get("user-agent"));
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  await mergeGuestCart(req, res, userId);
}

export async function register(req: Request, res: Response) {
  const data = V.registerSchema.parse(req.body);
  const user = await auth.register(data);
  await startSession(req, res, user.id);
  res.status(201).json({ user: auth.toPublicUser(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = V.loginSchema.parse(req.body);
  const user = await auth.login(email, password);
  await startSession(req, res, user.id);
  res.json({ user: auth.toPublicUser(user) });
}

export async function logout(req: Request, res: Response) {
  await auth.logout(req.sessionId);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  if (!req.user) return res.json({ user: null });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });
  res.json({ user: auth.toPublicUser(user) });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = V.forgotSchema.parse(req.body);
  await auth.forgotPassword(email);
  res.json({ message: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña." });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = V.resetSchema.parse(req.body);
  await auth.resetPassword(token, password);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ message: "Tu contraseña se actualizó. Ya puedes iniciar sesión." });
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = V.verifySchema.parse(req.body);
  await auth.verifyEmail(token);
  res.json({ message: "¡Gracias! Tu correo quedó verificado." });
}

export async function resendVerification(req: Request, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (user.emailVerifiedAt) throw badRequest("Tu correo ya está verificado.");
  await auth.sendVerificationEmail(user);
  res.json({ message: "Te enviamos un nuevo enlace de verificación." });
}

// ─── Perfil ───

export async function updateProfile(req: Request, res: Response) {
  const data = V.profileSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { ...data, phone: data.phone || null } });
  res.json({ user: auth.toPublicUser(user) });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = V.changePasswordSchema.parse(req.body);
  await auth.changePassword(req.user!.id, req.sessionId, currentPassword, newPassword);
  res.json({ message: "Contraseña actualizada." });
}

// ─── Direcciones ───

export async function listAddresses(req: Request, res: Response) {
  const items = await prisma.address.findMany({ where: { userId: req.user!.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  res.json({ items });
}

export async function saveAddress(req: Request, res: Response) {
  const data = V.addressSchema.parse(req.body);
  const userId = req.user!.id;
  const id = req.params.id as string | undefined;
  const address = await prisma.$transaction(async (tx) => {
    if (id) {
      const own = await tx.address.findFirst({ where: { id, userId } });
      if (!own) throw badRequest("Dirección no encontrada.");
    }
    const count = await tx.address.count({ where: { userId } });
    const isDefault = data.isDefault || count === 0;
    if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    const payload = { ...data, isDefault, intNumber: data.intNumber || null, references: data.references || null };
    return id ? tx.address.update({ where: { id }, data: payload }) : tx.address.create({ data: { ...payload, userId } });
  });
  res.status(id ? 200 : 201).json({ address });
}

export async function deleteAddress(req: Request, res: Response) {
  const { count } = await prisma.address.deleteMany({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (count === 0) throw badRequest("Dirección no encontrada.");
  res.json({ ok: true });
}

// ─── Favoritos ───

export async function listFavorites(req: Request, res: Response) {
  const favs = await prisma.favorite.findMany({
    where: { userId: req.user!.id, product: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
  });
  res.json({
    items: favs.map((f) => ({
      productId: f.productId,
      name: f.product.name,
      slug: f.product.slug,
      image: f.product.images[0]?.url ?? null,
      priceCents: f.product.salePriceCents ?? f.product.priceCents,
    })),
  });
}

export async function addFavorite(req: Request, res: Response) {
  const productId = String(req.params.productId);
  const exists = await prisma.product.findFirst({ where: { id: productId, status: "PUBLISHED" } });
  if (!exists) throw badRequest("Producto no encontrado.");
  await prisma.favorite.upsert({ where: { userId_productId: { userId: req.user!.id, productId } }, update: {}, create: { userId: req.user!.id, productId } });
  res.status(201).json({ ok: true });
}

export async function removeFavorite(req: Request, res: Response) {
  await prisma.favorite.deleteMany({ where: { userId: req.user!.id, productId: String(req.params.productId) } });
  res.json({ ok: true });
}
