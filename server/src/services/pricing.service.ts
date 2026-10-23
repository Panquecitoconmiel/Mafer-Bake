import { sha256 } from "../utils/crypto.js";
import { badRequest } from "../utils/errors.js";
import { effectivePrice, type ProductWithRelations } from "./catalog.service.js";

export type Selections = Record<string, string | string[]>;

export interface ResolvedCustomization {
  optionName: string;
  value: string;
  priceDeltaCents: number;
}

export interface ResolvedLine {
  unitPriceCents: number;
  variantId: string | null;
  variantName: string | null;
  customizations: ResolvedCustomization[];
  /** Selecciones normalizadas (solo opciones válidas y activas). */
  selections: Selections;
}

/**
 * Calcula el precio unitario de un artículo con la información confiable del servidor:
 * precio efectivo + variante + recargos de opciones. Rechaza opciones inexistentes,
 * inactivas, de otro producto o faltantes cuando son obligatorias.
 */
export function resolveLine(product: ProductWithRelations, variantId: string | null | undefined, selections: Selections): ResolvedLine {
  let unit = effectivePrice(product);
  let variantName: string | null = null;

  if (product.variants.length > 0) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) throw badRequest(`Selecciona una presentación válida para «${product.name}».`);
    unit += variant.priceDeltaCents;
    variantName = variant.name;
  } else if (variantId) {
    throw badRequest("La presentación seleccionada no existe.");
  }

  const known = new Set(product.options.map((o) => o.id));
  for (const key of Object.keys(selections)) {
    if (!known.has(key)) throw badRequest("Una de las opciones seleccionadas ya no está disponible.");
  }

  const customizations: ResolvedCustomization[] = [];
  const normalized: Selections = {};

  for (const option of product.options) {
    const raw = selections[option.id];
    const empty = raw == null || (Array.isArray(raw) ? raw.length === 0 : String(raw).trim() === "");
    if (empty) {
      if (option.isRequired) throw badRequest(`Elige «${option.name}».`);
      continue;
    }

    if (option.type === "TEXT") {
      if (typeof raw !== "string") throw badRequest(`«${option.name}» debe ser texto.`);
      const text = raw.trim().replace(/[\u0000-\u001f]/g, " ");
      const max = option.maxLength ?? 120;
      if (text.length > max) throw badRequest(`«${option.name}» admite máximo ${max} caracteres.`);
      customizations.push({ optionName: option.name, value: text, priceDeltaCents: 0 });
      normalized[option.id] = text;
      continue;
    }

    const ids = option.type === "SINGLE" ? (typeof raw === "string" ? [raw] : null) : Array.isArray(raw) ? raw : null;
    if (!ids) throw badRequest(`Selección no válida en «${option.name}».`);
    const unique = [...new Set(ids)];
    const values = unique.map((id) => option.values.find((v) => v.id === id));
    if (values.some((v) => !v)) throw badRequest(`Una opción de «${option.name}» ya no está disponible.`);
    for (const v of values) {
      unit += v!.priceDeltaCents;
      customizations.push({ optionName: option.name, value: v!.label, priceDeltaCents: v!.priceDeltaCents });
    }
    normalized[option.id] = option.type === "SINGLE" ? unique[0] : unique.sort();
  }

  if (unit < 0) throw badRequest("Configuración de precio no válida.");
  return { unitPriceCents: unit, variantId: variantName ? variantId! : null, variantName, customizations, selections: normalized };
}

/** Huella estable para agrupar artículos idénticos en el carrito. */
export function configKey(productId: string, variantId: string | null, selections: Selections) {
  const sorted = Object.keys(selections)
    .sort()
    .map((k) => [k, selections[k]]);
  return sha256(JSON.stringify([productId, variantId, sorted]));
}

export interface CouponLike {
  type: "PERCENT" | "FIXED";
  value: number;
}

export function couponDiscount(coupon: CouponLike, subtotalCents: number) {
  const raw = coupon.type === "PERCENT" ? Math.round((subtotalCents * coupon.value) / 100) : coupon.value;
  return Math.min(raw, subtotalCents);
}
