import "dotenv/config";
import { defineConfig } from "prisma/config";

// Configuración de la CLI de Prisma (migraciones y seed).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
