import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { mkdirSync } from "node:fs";
import { env } from "./config/env.js";
import { UPLOAD_DIR } from "./controllers/admin.controller.js";
import { stripeWebhook } from "./controllers/shop.controller.js";
import { loadSession } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { apiLimiter, originCheck } from "./middleware/security.js";
import { api } from "./routes/index.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
  app.use(cors({ origin: env.corsOrigins, credentials: true }));

  // Webhook de Stripe: requiere el cuerpo ORIGINAL para verificar la firma.
  // Se monta antes del parser JSON y sin verificación de origen (Stripe no envía Origin).
  app.post("/api/v1/webhooks/stripe", express.raw({ type: "application/json", limit: "1mb" }), stripeWebhook);

  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());

  mkdirSync(UPLOAD_DIR, { recursive: true });
  app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", fallthrough: false }));

  app.use("/api/v1", apiLimiter, originCheck, loadSession, api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
