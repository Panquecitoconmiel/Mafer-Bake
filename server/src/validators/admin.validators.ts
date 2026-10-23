import { z } from "zod";

const cents = z.number().int().min(0).max(100_000_000);
const delta = z.number().int().min(-10_000_000).max(10_000_000);
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug no válido.").max(80);
const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "La imagen debe ser una URL https o una ruta local.");

export const categorySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    slug: slug.optional(),
    description: z.string().trim().max(500).optional().nullable(),
    imageUrl: imageUrl.optional().nullable(),
    sortOrder: z.number().int().min(0).max(999).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

const optionValue = z.object({
  id: z.string().max(40).optional(),
  label: z.string().trim().min(1).max(80),
  priceDeltaCents: delta.default(0),
  isActive: z.boolean().default(true),
});

const option = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(1).max(80),
  type: z.enum(["SINGLE", "MULTIPLE", "TEXT"]),
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
  maxLength: z.number().int().min(1).max(300).optional().nullable(),
  values: z.array(optionValue).max(30).default([]),
});

const variant = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(1).max(80),
  priceDeltaCents: delta.default(0),
  isActive: z.boolean().default(true),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: slug.optional(),
    shortDescription: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(5000),
    priceCents: cents.refine((v) => v > 0, "El precio debe ser mayor a 0."),
    salePriceCents: cents.optional().nullable(),
    categoryId: z.string().min(1).max(40),
    isFeatured: z.boolean().default(false),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    isAvailable: z.boolean().default(true),
    inventoryMode: z.enum(["TRACKED", "MADE_TO_ORDER"]).default("MADE_TO_ORDER"),
    lowStockThreshold: z.number().int().min(0).max(10_000).default(5),
    prepTimeHours: z.number().int().min(0).max(24 * 30).default(24),
    images: z.array(z.object({ url: imageUrl, alt: z.string().trim().max(160).default("") })).max(10).default([]),
    variants: z.array(variant).max(20).default([]),
    options: z.array(option).max(20).default([]),
  })
  .strict()
  .refine((p) => p.salePriceCents == null || p.salePriceCents < p.priceCents, {
    message: "El precio promocional debe ser menor al precio normal.",
    path: ["salePriceCents"],
  });

export const productStatusSchema = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) }).strict();

export const inventoryAdjustSchema = z
  .object({
    type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
    quantity: z.number().int().refine((v) => v !== 0, "La cantidad no puede ser 0.").refine((v) => Math.abs(v) <= 10_000),
    reason: z.string().trim().min(3, "Indica el motivo.").max(200),
  })
  .strict();

export const orderStatusSchema = z
  .object({
    status: z.enum(["IN_PREPARATION", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
    confirmedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const orderNotesSchema = z.object({ adminNotes: z.string().trim().max(2000) }).strict();

export const refundSchema = z
  .object({
    amountCents: z.number().int().positive(),
    reason: z.string().trim().max(200).optional(),
    confirm: z.literal(true, { errorMap: () => ({ message: "Debes confirmar el reembolso." }) }),
  })
  .strict();

export const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "Código no válido (3-30 letras, números, - o _)."),
    description: z.string().trim().max(200).optional().nullable(),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.number().int().positive(),
    minSubtotalCents: cents.optional().nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    maxUses: z.number().int().positive().optional().nullable(),
    maxUsesPerUser: z.number().int().positive().optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .strict()
  .refine((c) => c.type !== "PERCENT" || c.value <= 100, { message: "El porcentaje debe estar entre 1 y 100.", path: ["value"] });

const optStr = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

export const settingsSchema = z
  .object({
    storeName: z.string().trim().min(1).max(80),
    slogan: z.string().trim().max(160),
    contactEmail: z.union([z.string().trim().email(), z.literal("")]).optional().nullable().transform((v) => (v ? v : null)),
    contactPhone: optStr(30),
    whatsapp: optStr(30),
    instagramUrl: optStr(200),
    facebookUrl: optStr(200),
    pickupAddress: optStr(300),
    businessHours: optStr(300),
    pickupEnabled: z.boolean(),
    deliveryEnabled: z.boolean(),
    deliveryFeeCents: cents.optional().nullable(),
    freeDeliveryMinCents: cents.optional().nullable(),
    deliveryCoverage: optStr(500),
    minLeadHours: z.number().int().min(0).max(24 * 30),
    maxAdvanceDays: z.number().int().min(1).max(365),
    closedWeekdays: z.array(z.number().int().min(0).max(6)).max(7),
    pricesIncludeTax: z.boolean(),
    taxRatePercent: z.number().min(0).max(100).optional().nullable(),
    cancellationPolicy: optStr(2000),
  })
  .strict()
  .refine((s) => !s.deliveryEnabled || s.deliveryFeeCents != null, {
    message: "Define el costo de envío antes de habilitar la entrega a domicilio.",
    path: ["deliveryFeeCents"],
  })
  .refine((s) => s.pricesIncludeTax || s.taxRatePercent != null, {
    message: "Indica la tasa de impuesto si los precios no la incluyen.",
    path: ["taxRatePercent"],
  });

export const slotSchema = z
  .object({
    label: z.string().trim().min(1).max(40),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    capacity: z.number().int().min(1).max(500),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(99).default(0),
  })
  .strict();

export const blockedDateSchema = z
  .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string().trim().max(120).optional().nullable() })
  .strict();

export const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.string().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
