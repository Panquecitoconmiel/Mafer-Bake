/**
 * Datos de DEMOSTRACIÓN para Mafer.
 * Precios, existencias y franjas horarias son ejemplos para probar la tienda:
 * modifícalos desde el panel administrativo antes de vender.
 * El script es idempotente: actualiza por slug y no borra pedidos ni usuarios.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type InventoryMode, type OptionType } from "@prisma/client";

const url = process.env.SEED_DATABASE_URL ?? process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const categories = [
  { slug: "cupcakes", name: "Cupcakes", description: "Pequeños, esponjosos y decorados a mano.", sortOrder: 1 },
  { slug: "pasteles", name: "Pasteles", description: "Clásicos de la casa para compartir.", sortOrder: 2 },
  { slug: "galletas", name: "Galletas", description: "Horneadas en pequeños lotes cada día.", sortOrder: 3 },
  { slug: "pasteles-personalizados", name: "Pasteles personalizados", description: "Diseñados contigo para tu celebración.", sortOrder: 4 },
  { slug: "postres-especiales", name: "Postres especiales", description: "Creaciones de temporada.", sortOrder: 5 },
  { slug: "cajas-de-regalo", name: "Cajas de regalo", description: "Detalles dulces listos para regalar.", sortOrder: 6 },
  { slug: "paquetes-para-eventos", name: "Paquetes para eventos", description: "Mesas de postres para fiestas y reuniones.", sortOrder: 7 },
  { slug: "promociones", name: "Promociones", description: "Ofertas por tiempo limitado.", sortOrder: 8 },
];

type Opt = { name: string; type: OptionType; isRequired?: boolean; maxLength?: number; values?: [string, number][] };
type Seed = {
  slug: string;
  name: string;
  category: string;
  short: string;
  description: string;
  price: number; // pesos
  sale?: number;
  featured?: boolean;
  mode: InventoryMode;
  stock?: number;
  prep: number;
  image: string;
  variants?: [string, number][]; // [nombre, recargo en pesos]
  options?: Opt[];
};

const coberturaCupcake: Opt = { name: "Cobertura", type: "SINGLE", isRequired: true, values: [["Buttercream de vainilla", 0], ["Queso crema", 5], ["Ganache de chocolate", 5]] };
const decoracionCupcake: Opt = { name: "Decoración", type: "MULTIPLE", values: [["Chispas de colores", 0], ["Perlas comestibles", 5], ["Flor de fondant", 10]] };
const mensaje: Opt = { name: "Mensaje en el pastel", type: "TEXT", maxLength: 40 };
const tamanos: [string, number][] = [["Chico · 8 a 10 porciones", 0], ["Mediano · 15 a 20 porciones", 260], ["Grande · 25 a 30 porciones", 560]];

const products: Seed[] = [
  {
    slug: "cupcake-de-vainilla", name: "Cupcake de vainilla", category: "cupcakes", featured: true,
    short: "Bizcocho de vainilla con buttercream suave.",
    description: "Nuestro clásico: bizcocho húmedo de vainilla, cubierto con un buttercream ligero y decorado a mano. Ideal para cualquier antojo o para armar una mesa de postres.",
    price: 45, mode: "TRACKED", stock: 24, prep: 0, image: "/demo/cupcake-vainilla.svg",
    variants: [["1 pieza", 0], ["Caja de 6", 220], ["Caja de 12", 470]],
    options: [coberturaCupcake, decoracionCupcake],
  },
  {
    slug: "cupcake-de-chocolate", name: "Cupcake de chocolate", category: "cupcakes",
    short: "Chocolate intenso con ganache sedoso.",
    description: "Bizcocho de cacao con corazón suave, coronado con ganache de chocolate semiamargo. Para los amantes del chocolate.",
    price: 48, mode: "TRACKED", stock: 24, prep: 0, image: "/demo/cupcake-chocolate.svg",
    variants: [["1 pieza", 0], ["Caja de 6", 235], ["Caja de 12", 500]],
    options: [decoracionCupcake],
  },
  {
    slug: "cupcakes-surtidos", name: "Cupcakes surtidos", category: "cupcakes", featured: true,
    short: "Caja de 12 cupcakes con tus sabores favoritos.",
    description: "Elige hasta cuatro sabores y los repartimos en una caja de 12 piezas. Perfecta para compartir en la oficina, en casa o en una celebración.",
    price: 480, mode: "MADE_TO_ORDER", prep: 24, image: "/demo/cupcakes-surtidos.svg",
    options: [
      { name: "Sabores", type: "MULTIPLE", isRequired: true, values: [["Vainilla", 0], ["Chocolate", 0], ["Red velvet", 20], ["Limón", 0]] },
      { name: "Cobertura", type: "SINGLE", isRequired: true, values: [["Buttercream", 0], ["Queso crema", 30]] },
      { name: "Presentación", type: "SINGLE", isRequired: true, values: [["Caja kraft", 0], ["Caja de regalo con moño", 60]] },
    ],
  },
  {
    slug: "pastel-de-chocolate", name: "Pastel de chocolate", category: "pasteles", featured: true,
    short: "Tres capas de chocolate con ganache.",
    description: "Pan de chocolate en tres capas, relleno a tu elección y cubierta de ganache brillante. Un clásico que nunca falla.",
    price: 520, mode: "MADE_TO_ORDER", prep: 48, image: "/demo/pastel-chocolate.svg",
    variants: tamanos,
    options: [{ name: "Relleno", type: "SINGLE", isRequired: true, values: [["Ganache", 0], ["Cajeta", 40], ["Frambuesa", 60]] }, mensaje],
  },
  {
    slug: "pastel-de-fresas-con-crema", name: "Pastel de fresas con crema", category: "pasteles", featured: true,
    short: "Bizcocho de vainilla, crema batida y fresas frescas.",
    description: "Capas de bizcocho de vainilla con crema chantilly y fresas frescas de temporada. Ligero, fresco y muy especial.",
    price: 580, mode: "MADE_TO_ORDER", prep: 48, image: "/demo/pastel-fresas.svg",
    variants: tamanos,
    options: [mensaje],
  },
  {
    slug: "pastel-de-vainilla-para-cumpleanos", name: "Pastel de vainilla para cumpleaños", category: "pasteles",
    short: "Alegre, colorido y listo para soplar las velas.",
    description: "Pastel de vainilla con relleno de crema pastelera, cubierta a elegir y decoración festiva. Cuéntanos los colores de la fiesta.",
    price: 550, mode: "MADE_TO_ORDER", prep: 48, image: "/demo/pastel-cumpleanos.svg",
    variants: tamanos,
    options: [
      { name: "Cobertura", type: "SINGLE", isRequired: true, values: [["Betún de mantequilla", 0], ["Chantilly", 0], ["Fondant", 150]] },
      { name: "Decoración", type: "MULTIPLE", values: [["Chispas de colores", 0], ["Topper «Feliz cumpleaños»", 45], ["Flores comestibles", 120]] },
      { name: "Colores", type: "TEXT", maxLength: 60 },
      mensaje,
    ],
  },
  {
    slug: "pastel-personalizado", name: "Pastel personalizado", category: "pasteles-personalizados", featured: true,
    short: "Diseñado a tu medida: sabor, relleno, colores y temática.",
    description: "Creamos el pastel de tu celebración desde cero. Elige el pan, el relleno, la cobertura y cuéntanos tu idea. Te confirmaremos el diseño antes de prepararlo.",
    price: 850, mode: "MADE_TO_ORDER", prep: 72, image: "/demo/pastel-personalizado.svg",
    variants: tamanos,
    options: [
      { name: "Sabor del pan", type: "SINGLE", isRequired: true, values: [["Vainilla", 0], ["Chocolate", 0], ["Red velvet", 50], ["Zanahoria", 50]] },
      { name: "Relleno", type: "SINGLE", isRequired: true, values: [["Crema pastelera", 0], ["Ganache", 0], ["Frutos rojos", 60], ["Cajeta", 40]] },
      { name: "Cobertura", type: "SINGLE", isRequired: true, values: [["Buttercream", 0], ["Chantilly", 0], ["Fondant", 200]] },
      { name: "Decoración", type: "MULTIPLE", values: [["Flores de buttercream", 0], ["Flores naturales comestibles", 150], ["Figura de fondant", 180], ["Topper personalizado", 90]] },
      { name: "Temática", type: "TEXT", maxLength: 80 },
      { name: "Colores", type: "TEXT", maxLength: 60 },
      mensaje,
      { name: "Instrucciones adicionales", type: "TEXT", maxLength: 300 },
    ],
  },
  {
    slug: "galletas-con-chispas-de-chocolate", name: "Galletas con chispas de chocolate", category: "galletas", featured: true,
    short: "Crujientes por fuera, suaves por dentro.",
    description: "Galletas de mantequilla con abundantes chispas de chocolate semiamargo, horneadas en pequeños lotes.",
    price: 25, mode: "TRACKED", stock: 40, prep: 0, image: "/demo/galletas-chispas.svg",
    variants: [["1 pieza", 0], ["Bolsa de 6", 110], ["Bolsa de 12", 245]],
  },
  {
    slug: "galletas-decoradas", name: "Galletas decoradas", category: "galletas",
    short: "Galletas de mantequilla decoradas con glaseado.",
    description: "Galletas de mantequilla y vainilla decoradas a mano con glaseado real. Ideales como recuerdo para eventos.",
    price: 45, mode: "MADE_TO_ORDER", prep: 72, image: "/demo/galletas-decoradas.svg",
    options: [
      { name: "Decoración", type: "SINGLE", isRequired: true, values: [["Diseño de temporada", 0], ["Temática personalizada", 15]] },
      { name: "Temática", type: "TEXT", maxLength: 80 },
      { name: "Presentación", type: "SINGLE", isRequired: true, values: [["Bolsita individual", 0], ["Caja", 30]] },
    ],
  },
  {
    slug: "caja-de-galletas-surtidas", name: "Caja de galletas surtidas", category: "cajas-de-regalo",
    short: "Doce galletas surtidas en caja de regalo.",
    description: "Una selección de nuestras galletas favoritas en una caja lista para regalar: chispas de chocolate, avena, mantequilla y decoradas.",
    price: 320, sale: 289, mode: "TRACKED", stock: 10, prep: 0, image: "/demo/caja-galletas.svg",
    options: [{ name: "Tarjeta con mensaje", type: "TEXT", maxLength: 120 }],
  },
];

async function main() {
  await prisma.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const catIds = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    catIds.set(c.slug, cat.id);
  }

  for (const p of products) {
    const data = {
      name: p.name,
      shortDescription: p.short,
      description: p.description,
      priceCents: p.price * 100,
      salePriceCents: p.sale ? p.sale * 100 : null,
      categoryId: catIds.get(p.category)!,
      isFeatured: p.featured ?? false,
      status: "PUBLISHED" as const,
      inventoryMode: p.mode,
      prepTimeHours: p.prep,
    };
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      console.info(`· ${p.name}: ya existe (no se modifica)`);
      continue;
    }
    const created = await prisma.product.create({
      data: {
        ...data,
        slug: p.slug,
        stock: p.stock ?? 0,
        images: { create: [{ url: p.image, alt: p.name, sortOrder: 0 }] },
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

  console.info("\nDatos de demostración listos. Ajusta precios, existencias y horarios desde /admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
