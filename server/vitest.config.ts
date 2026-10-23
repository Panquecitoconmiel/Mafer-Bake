import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Las pruebas comparten una base de datos: se ejecutan en serie.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      // Claves FICTICIAS: el cliente de Stripe se sustituye por un doble de prueba
      // y la firma de webhooks se genera localmente con el SDK oficial.
      STRIPE_SECRET_KEY: "sk_test_mafer_dummy",
      STRIPE_WEBHOOK_SECRET: "whsec_mafer_test_secret",
    },
  },
});
