import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { forbidden } from "../utils/errors.js";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Protección CSRF para autenticación con cookies:
 * las peticiones que modifican datos deben provenir de un origen permitido.
 * Combinado con SameSite=Lax y CORS restringido.
 */
export function originCheck(req: Request, _res: Response, next: NextFunction) {
  if (SAFE.has(req.method)) return next();
  const origin = req.get("origin") ?? (req.get("referer") ? new URL(req.get("referer")!).origin : undefined);
  if (!origin) {
    // Clientes sin navegador (curl, pruebas) no envían Origin; las cookies de sesión
    // SameSite no viajan en peticiones cruzadas sin Origin desde navegadores modernos.
    if (env.isProd) throw forbidden("Origen de la petición no permitido.");
    return next();
  }
  if (!env.corsOrigins.includes(origin)) throw forbidden("Origen de la petición no permitido.");
  next();
}

const skip = () => env.isTest;

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip,
  message: { error: { message: "Demasiadas peticiones. Intenta de nuevo en un momento." } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip,
  message: { error: { message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." } },
});
