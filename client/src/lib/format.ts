import type { OrderStatus, PaymentStatus } from "../types";

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

/** 12345 → "$123.45" */
export const money = (cents: number) => mxn.format(cents / 100);

/** "2026-10-28" → "miércoles 28 de octubre de 2026" (sin desfases de zona horaria). */
export function longDate(dateOnly: string) {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export const shortDateTime = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const shortDate = (iso: string) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/** Recargo legible: 2500 → "+$25.00", 0 → "" */
export const delta = (cents: number) => (cents === 0 ? "" : `${cents > 0 ? "+" : "−"}${money(Math.abs(cents))}`);

export const ORDER_STATUS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  CONFIRMED: "Confirmado",
  IN_PREPARATION: "En preparación",
  READY: "Listo",
  OUT_FOR_DELIVERY: "En camino",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  FAILED: "Rechazado",
  CANCELLED: "Cancelado",
  PARTIALLY_REFUNDED: "Reembolso parcial",
  REFUNDED: "Reembolsado",
};

export const prepTime = (hours: number) =>
  hours === 0 ? "Disponible para entrega inmediata" : hours < 24 ? `Se prepara en ${hours} h` : `Pide con ${Math.ceil(hours / 24)} día${hours > 24 ? "s" : ""} de anticipación`;

/** Fecha local de hoy en formato YYYY-MM-DD. */
export function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "120.50" → 12050; devuelve null si no es válido. */
export function parseMoney(input: string): number | null {
  const n = Number(String(input).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
