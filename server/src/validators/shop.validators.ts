import { z } from "zod";

export const productQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().int().min(0).optional(), // en pesos
  maxPrice: z.coerce.number().int().min(0).optional(),
  available: z.enum(["true", "false"]).optional(),
  featured: z.enum(["true", "false"]).optional(),
  onSale: z.enum(["true", "false"]).optional(),
  bestSellers: z.enum(["true", "false"]).optional(),
  sort: z.enum(["popular", "newest", "price_asc", "price_desc", "name"]).default("popular"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

/** { [optionId]: "valueId" | ["valueId", …] | "texto libre" } */
export const selectionsSchema = z
  .record(z.string().max(40), z.union([z.string().max(300), z.array(z.string().max(40)).max(20)]))
  .default({});

export const addCartItemSchema = z
  .object({
    productId: z.string().min(1).max(40),
    variantId: z.string().max(40).optional().nullable(),
    quantity: z.number().int().min(1).max(99),
    selections: selectionsSchema,
  })
  .strict();

export const updateCartItemSchema = z.object({ quantity: z.number().int().min(1).max(99) }).strict();

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.");

export const checkoutBaseSchema = z.object({
  deliveryMethod: z.enum(["PICKUP", "DELIVERY"]),
  addressId: z.string().max(40).optional().nullable(),
  requestedDate: dateOnly,
  slotId: z.string().min(1).max(40),
  couponCode: z.string().trim().toUpperCase().max(40).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const quoteSchema = checkoutBaseSchema.partial({ requestedDate: true, slotId: true });

export const createOrderSchema = checkoutBaseSchema
  .extend({
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "Debes aceptar las condiciones de compra." }) }),
    idempotencyKey: z.string().uuid("Clave de idempotencia inválida."),
    /** Total que vio el cliente; si cambió, se le avisa antes de cobrar. */
    expectedTotalCents: z.number().int().min(0),
  })
  .strict();

export const checkoutSessionSchema = z.object({ orderId: z.string().min(1).max(40) }).strict();
