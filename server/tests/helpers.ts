import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/services/auth.service.js";
import { storeToday } from "../src/services/settings.service.js";

export const app = createApp();

/** Vacía todas las tablas de la base de pruebas. */
export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename::text AS tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function seedCatalog() {
  const cat = await prisma.category.create({ data: { name: "Pasteles", slug: "pasteles" } });
  const cake = await prisma.product.create({
    data: {
      name: "Pastel de prueba",
      slug: "pastel-de-prueba",
      shortDescription: "Corto",
      description: "Largo",
      priceCents: 50000,
      categoryId: cat.id,
      status: "PUBLISHED",
      inventoryMode: "MADE_TO_ORDER",
      prepTimeHours: 48,
      variants: { create: [{ name: "Chico", priceDeltaCents: 0 }, { name: "Grande", priceDeltaCents: 30000, sortOrder: 1 }] },
      options: {
        create: [
          { name: "Relleno", type: "SINGLE", isRequired: true, values: { create: [{ label: "Ganache", priceDeltaCents: 0 }, { label: "Frambuesa", priceDeltaCents: 6000, sortOrder: 1 }] } },
          { name: "Mensaje", type: "TEXT", maxLength: 20, sortOrder: 1 },
        ],
      },
    },
    include: { variants: true, options: { include: { values: true } } },
  });
  const cookie = await prisma.product.create({
    data: {
      name: "Galleta de prueba",
      slug: "galleta-de-prueba",
      shortDescription: "Corto",
      description: "Largo",
      priceCents: 2500,
      categoryId: cat.id,
      status: "PUBLISHED",
      inventoryMode: "TRACKED",
      stock: 5,
      prepTimeHours: 0,
    },
  });
  const draft = await prisma.product.create({
    data: { name: "Borrador", slug: "borrador", shortDescription: "x", description: "x", priceCents: 1000, categoryId: cat.id, status: "DRAFT" },
  });
  const slot = await prisma.deliverySlot.create({ data: { label: "10:00 – 13:00", startTime: "10:00", endTime: "13:00", capacity: 2 } });
  await prisma.storeSettings.create({ data: { id: 1 } });
  return { cat, cake, cookie, draft, slot };
}

/** Fecha válida dentro de N días (zona horaria de la tienda). */
export function futureDate(days = 5) {
  const d = new Date(`${storeToday()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function createUser(email: string, role: "CUSTOMER" | "ADMIN" = "CUSTOMER", password = "secreto123") {
  return prisma.user.create({
    data: { email, firstName: "Ana", lastName: "Prueba", role, passwordHash: await hashPassword(password), emailVerifiedAt: new Date() },
  });
}

/** Agente con cookies persistentes ya autenticado. */
export async function login(email: string, password = "secreto123") {
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`login falló: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}
