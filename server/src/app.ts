import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { UPLOAD_DIR } from "./controllers/admin.controller.js";
import { stripeWebhook } from "./controllers/shop.controller.js";
import { loadSession } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { apiLimiter, originCheck } from "./middleware/security.js";
import { api } from "./routes/index.js";

/** Carpeta de la tienda compilada: server/{src|dist}/app → ../../client/dist */
const CLIENT_DIST = path.resolve(
  env.CLIENT_DIST_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "client", "dist"),
);

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-site" },
      contentSecurityPolicy: {
        directives: {
          // Imágenes propias, subidas o con URL https definida en el panel.
          "img-src": ["'self'", "data:", "https:"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
          // Permite el envío del navegador a Stripe Checkout.
          "form-action": ["'self'", "https://checkout.stripe.com"],
        },
      },
    }),
  );
  app.use(cors({ origin: env.corsOrigins, credentials: true }));

  // Webhook de Stripe: requiere el cuerpo ORIGINAL para verificar la firma.
  // Se monta antes del parser JSON y sin verificación de origen (Stripe no envía Origin).
  app.post("/api/v1/webhooks/stripe", express.raw({ type: "application/json", limit: "1mb" }), stripeWebhook);

  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());

  mkdirSync(UPLOAD_DIR, { recursive: true });
  app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", fallthrough: false }));

  app.use("/api/v1", apiLimiter, originCheck, loadSession, api);

  // En producción la misma API entrega la tienda (un solo servicio y un solo dominio,
  // así las cookies de sesión funcionan sin configuración entre sitios).
  if (env.isProd && existsSync(path.join(CLIENT_DIST, "index.html"))) {
    app.use(express.static(CLIENT_DIST, { index: false, maxAge: "1h", setHeaders: immutableAssets }));
    // Cualquier otra ruta GET que no sea de la API es una página de la tienda (SPA).
    app.get(/^(?!\/api\/|\/uploads\/).*/, (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(CLIENT_DIST, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

/** Los archivos de /assets llevan huella en el nombre: se pueden guardar en caché un año. */
function immutableAssets(res: express.Response, filePath: string) {
  if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
}
