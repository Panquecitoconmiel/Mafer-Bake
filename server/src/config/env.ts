import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().optional().default(""),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  TEST_DATABASE_URL: z.string().optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_CURRENCY: z.string().toLowerCase().default("mxn"),
  MAIL_FROM: z.string().default("Mafer <no-reply@example.com>"),
  STORE_TIMEZONE: z.string().default("America/Mexico_City"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Variables de entorno inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

if (raw.NODE_ENV === "production" && raw.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.warn("Aviso: se está usando una clave de PRUEBA de Stripe en producción.");
}

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === "production",
  isTest: raw.NODE_ENV === "test",
  corsOrigins: [raw.CLIENT_URL, ...raw.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)],
  stripeEnabled: raw.STRIPE_SECRET_KEY.length > 0,
};
