import bcrypt from "bcryptjs";
import type { AuthTokenType, User } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { randomToken, sha256 } from "../utils/crypto.js";
import { AppError, badRequest, conflict, unauthorized } from "../utils/errors.js";
import { sendMail } from "./mail.service.js";

const BCRYPT_COST = env.isTest ? 4 : 12;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
// Hash ficticio para igualar tiempos cuando el correo no existe.
const DUMMY_HASH = bcrypt.hashSync("mafer-timing-equalizer", 4);

export const hashPassword = (pw: string) => bcrypt.hash(pw, BCRYPT_COST);

export function toPublicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    emailVerified: !!u.emailVerifiedAt,
    createdAt: u.createdAt,
  };
}

export async function createSession(userId: string, userAgent?: string) {
  const token = randomToken(32);
  await prisma.session.create({
    data: {
      id: sha256(token),
      userId,
      userAgent: userAgent?.slice(0, 200),
      expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000),
    },
  });
  return token;
}

async function issueToken(userId: string, type: AuthTokenType, ttlMinutes: number) {
  // Invalida tokens anteriores del mismo tipo (un solo token vigente).
  await prisma.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } });
  const token = randomToken(32);
  await prisma.authToken.create({
    data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) },
  });
  return token;
}

async function consumeToken(token: string, type: AuthTokenType) {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest("El enlace no es válido o ya expiró. Solicita uno nuevo.");
  }
  // Marcado condicional: evita que dos peticiones simultáneas usen el mismo token.
  const { count } = await prisma.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (count === 0) throw badRequest("El enlace no es válido o ya expiró. Solicita uno nuevo.");
  return record;
}

export async function sendVerificationEmail(user: Pick<User, "id" | "email" | "firstName">) {
  const token = await issueToken(user.id, "EMAIL_VERIFICATION", 60 * 24);
  await sendMail({
    to: user.email,
    subject: "Confirma tu correo en Mafer",
    text: `Hola ${user.firstName}:\n\nConfirma tu correo electrónico con este enlace (válido 24 horas):\n${env.CLIENT_URL}/verificar-correo?token=${token}\n\nSi no creaste una cuenta en Mafer, ignora este mensaje.`,
  });
}

export async function register(input: { firstName: string; lastName: string; email: string; password: string }) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw conflict("No fue posible crear la cuenta con ese correo. Si ya tienes cuenta, inicia sesión.");

  const user = await prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: await hashPassword(input.password),
      role: "CUSTOMER", // el registro público nunca crea administradores
    },
  });
  await sendVerificationEmail(user);
  return user;
}

export async function login(email: string, password: string) {
  const generic = unauthorized("Correo o contraseña incorrectos.");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(429, "Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.", "LOCKED");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data:
        failed >= MAX_FAILED
          ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
          : { failedLoginCount: failed },
    });
    throw generic;
  }
  if (!user.isActive) throw unauthorized("Esta cuenta está desactivada. Contáctanos para más información.");

  if (user.failedLoginCount > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  }
  return user;
}

export async function logout(sessionId: string | undefined) {
  if (sessionId) await prisma.session.deleteMany({ where: { id: sessionId } });
}

/** Siempre responde igual, exista o no el correo, para no revelar cuentas. */
export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;
  const token = await issueToken(user.id, "PASSWORD_RESET", 60);
  await sendMail({
    to: user.email,
    subject: "Restablece tu contraseña de Mafer",
    text: `Hola ${user.firstName}:\n\nRecibimos una solicitud para restablecer tu contraseña. Usa este enlace (válido 1 hora):\n${env.CLIENT_URL}/restablecer-contrasena?token=${token}\n\nSi no fuiste tú, ignora este mensaje: tu contraseña no cambiará.`,
  });
}

export async function resetPassword(token: string, password: string) {
  const record = await consumeToken(token, "PASSWORD_RESET");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password), failedLoginCount: 0, lockedUntil: null },
    }),
    // Cierra todas las sesiones abiertas tras cambiar la contraseña.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
}

export async function verifyEmail(token: string) {
  const record = await consumeToken(token, "EMAIL_VERIFICATION");
  await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
}

export async function changePassword(userId: string, currentSessionId: string | undefined, current: string, next: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(current, user.passwordHash))) throw badRequest("La contraseña actual no es correcta.");
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } }),
    prisma.session.deleteMany({ where: { userId, NOT: { id: currentSessionId ?? "" } } }),
  ]);
}
