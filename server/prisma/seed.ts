/**
 * Datos de DEMOSTRACIÓN para Mafer (catálogo en prisma/catalog.ts).
 * Precios, existencias y franjas horarias son ejemplos para probar la tienda:
 * modifícalos desde el panel administrativo antes de vender.
 *
 * Es seguro ejecutarlo varias veces: no borra usuarios ni pedidos, no modifica productos
 * que ya existan y retira los productos de la demostración anterior (ilustraciones /demo/).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { mysqlAdapter } from "../src/config/mysql.js";
import { categories, products, retiredCategories } from "./catalog.js";

const url = process.env.SEED_DATABASE_URL ?? process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: mysqlAdapter(url) });
const image = (slug: string) => `/productos/${slug}.webp`;

async function retireOldDemo() {
  const old = await prisma.product.findMany({
    where: { images: { some: { url: { startsWith: "/demo/" } } } },
    include: { _count: { select: { orderItems: true } } },
  });
  for (const p of old) {
    if (p._count.orderItems === 0) {
      await prisma.product.delete({ where: { id: p.id } });
    } else {
      // Tiene pedidos: se archiva y se libera su slug para conservar el historial.
      await prisma.product.update({ where: { id: p.id }, data: { status: "ARCHIVED", slug: `${p.slug}-anterior-${p.id.slice(-4)}` } });
    }
    console.info(`− Retirado de la demostración anterior: ${p.name}`);
  }
  await prisma.category.updateMany({ where: { slug: { in: retiredCategories } }, data: { isActive: false } });
}

async function main() {
  await prisma.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, closedWeekdays: [] } });
  await retireOldDemo();

  const catIds = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, imageUrl: c.imageUrl, sortOrder: c.sortOrder, isActive: true },
      create: c,
    });
    catIds.set(c.slug, cat.id);
  }

  // Orden de creación: primero las velas (tienen su propia sección en la portada) y luego los
  // postres intercalados por categoría, para que «Novedades» y «Destacados» se vean variados.
  const byCat = new Map<string, typeof products>();
  for (const p of products.filter((x) => x.category !== "velas")) byCat.set(p.category, [...(byCat.get(p.category) ?? []), p]);
  const mixed: typeof products = products.filter((x) => x.category === "velas");
  for (let i = 0; mixed.length < products.length; i++) for (const list of byCat.values()) if (list[i]) mixed.push(list[i]);

  for (const p of mixed) {
    if (await prisma.product.findUnique({ where: { slug: p.slug } })) {
      console.info(`· ${p.name}: ya existe (no se modifica)`);
      continue;
    }
    const created = await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        shortDescription: p.short,
        description: p.description,
        priceCents: p.price * 100,
        salePriceCents: p.sale ? p.sale * 100 : null,
        categoryId: catIds.get(p.category)!,
        isFeatured: p.featured ?? false,
        status: "PUBLISHED",
        inventoryMode: p.mode,
        stock: p.stock ?? 0,
        lowStockThreshold: p.low ?? 5,
        prepTimeHours: p.prep,
        images: { create: [{ url: image(p.slug), alt: p.name, sortOrder: 0 }] },
        variants: { create: (p.variants ?? []).map(([name, delta], i) => ({ name, priceDeltaCents: delta * 100, sortOrder: i })) },
      },
    });
    for (const [i, o] of (p.options ?? []).entries()) {
      await prisma.productOption.create({
        data: {
          productId: created.id,
          name: o.name,
          type: o.type,
          isRequired: o.isRequired ?? false,
          maxLength: o.type === "TEXT" ? (o.maxLength ?? 120) : null,
          sortOrder: i,
          values: { create: (o.values ?? []).map(([label, delta], j) => ({ label, priceDeltaCents: delta * 100, sortOrder: j })) },
        },
      });
    }
    if (p.mode === "TRACKED" && p.stock) {
      await prisma.inventoryMovement.create({
        data: { productId: created.id, type: "IN", quantity: p.stock, stockAfter: p.stock, reason: "Inventario inicial (demostración)" },
      });
    }
    console.info(`✓ ${p.name}`);
  }

  if ((await prisma.deliverySlot.count()) === 0) {
    await prisma.deliverySlot.createMany({
      data: [
        { label: "10:00 – 13:00", startTime: "10:00", endTime: "13:00", capacity: 8, sortOrder: 1 },
        { label: "13:00 – 16:00", startTime: "13:00", endTime: "16:00", capacity: 8, sortOrder: 2 },
        { label: "16:00 – 19:00", startTime: "16:00", endTime: "19:00", capacity: 6, sortOrder: 3 },
      ],
    });
    console.info("✓ Franjas horarias de demostración");
  }

  console.info(`\nCatálogo de demostración listo (${products.length} productos). Ajusta precios, existencias y fotos desde /admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
