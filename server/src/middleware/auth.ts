import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { sha256 } from "../utils/crypto.js";
import { forbidden, unauthorized } from "../utils/errors.js";

export const SESSION_COOKIE = "mafer_sid";

export const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
});

/** Carga el usuario de la sesión (si existe y es válida). No bloquea la petición. */
export async function loadSession(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length < 20) return next();

  const id = sha256(token);
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    if (session) await prisma.session.delete({ where: { id } }).catch(() => undefined);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    return next();
  }

  const u = session.user;
  req.sessionId = id;
  req.user = {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    emailVerified: !!u.emailVerifiedAt,
  };
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw unauthorized();
  next();
}

/** El rol se valida siempre contra la base de datos (cargado en loadSession). */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw unauthorized();
  if (req.user.role !== "ADMIN") throw forbidden();
  next();
}
