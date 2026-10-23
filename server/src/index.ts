import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.info(`🧁 API de Mafer escuchando en http://localhost:${env.PORT}/api/v1`);
  if (!env.stripeEnabled) console.warn("⚠️  STRIPE_SECRET_KEY no está configurada: el pago en línea aparecerá como no disponible.");
  else if (!env.STRIPE_WEBHOOK_SECRET) console.warn("⚠️  STRIPE_WEBHOOK_SECRET no está configurada: los webhooks se rechazarán.");
});

// Limpieza periódica de sesiones expiradas.
const cleanup = setInterval(() => {
  prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);
}, 60 * 60 * 1000);

async function shutdown() {
  clearInterval(cleanup);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
