import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Ruta no encontrada." } });
}

/** Manejador central: nunca devuelve trazas internas al cliente. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "VALIDATION", message: "Revisa los datos enviados.", details: err.flatten().fieldErrors },
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: { code: "CONFLICT", message: "Ya existe un registro con esos datos." } });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "No encontrado." } });
    }
  }
  if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "BAD_JSON", message: "El cuerpo de la petición no es JSON válido." } });
  }
  console.error("[error]", err instanceof Error ? err.message : err);
  if (err instanceof Error && process.env.NODE_ENV !== "production") console.error(err.stack);
  res.status(500).json({ error: { code: "INTERNAL", message: "Ocurrió un error inesperado. Inténtalo de nuevo." } });
}
