import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { mysqlAdapter } from "./mysql.js";

if (env.isTest && (!env.TEST_DATABASE_URL || env.TEST_DATABASE_URL === env.DATABASE_URL)) {
  // Las pruebas vacían la base: nunca deben apuntar a la de desarrollo o producción.
  throw new Error("Define TEST_DATABASE_URL con una base de datos exclusiva para pruebas.");
}
const connectionString = env.isTest ? env.TEST_DATABASE_URL! : env.DATABASE_URL;

export const prisma = new PrismaClient({
  adapter: mysqlAdapter(connectionString),
  log: env.isProd ? ["error"] : ["warn", "error"],
});

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
