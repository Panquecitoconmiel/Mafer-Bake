import type { StoreSettings } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma, type Tx } from "../config/prisma.js";
import { badRequest } from "../utils/errors.js";
import { parseDateOnly, toDateOnly } from "../utils/format.js";

export async function getSettings(tx: Tx = prisma): Promise<StoreSettings> {
  return tx.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/** Información pública de la tienda (sin datos internos). */
export function publicSettings(s: StoreSettings) {
  return {
    storeName: s.storeName,
    slogan: s.slogan,
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
    whatsapp: s.whatsapp,
    instagramUrl: s.instagramUrl,
    facebookUrl: s.facebookUrl,
    pickupAddress: s.pickupAddress,
    businessHours: s.businessHours,
    pickupEnabled: s.pickupEnabled,
    deliveryEnabled: s.deliveryEnabled && s.deliveryFeeCents != null,
    deliveryFeeCents: s.deliveryFeeCents,
    freeDeliveryMinCents: s.freeDeliveryMinCents,
    deliveryCoverage: s.deliveryCoverage,
    minLeadHours: s.minLeadHours,
    maxAdvanceDays: s.maxAdvanceDays,
    closedWeekdays: s.closedWeekdays,
    pricesIncludeTax: s.pricesIncludeTax,
    cancellationPolicy: s.cancellationPolicy,
    paymentsEnabled: env.stripeEnabled,
    currency: env.STRIPE_CURRENCY,
  };
}

/** Desfase en minutos de la zona horaria de la tienda para una fecha dada. */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - date.getTime()) / 60_000;
}

/** Convierte fecha + hora local de la tienda a un instante UTC. */
export function storeLocalToUtc(dateStr: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = parseDateOnly(dateStr);
  const naive = new Date(d.getTime() + (h * 60 + m) * 60_000);
  const offset = tzOffsetMinutes(naive, env.STORE_TIMEZONE);
  return new Date(naive.getTime() - offset * 60_000);
}

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de la tienda. */
export function storeToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: env.STORE_TIMEZONE }).format(now);
}

/** Franjas para una fecha, con la capacidad restante y si cumplen el tiempo mínimo de anticipación. */
export async function slotsForDate(dateStr: string, leadHours: number, tx: Tx = prisma) {
  const settings = await getSettings(tx);
  const date = parseDateOnly(dateStr);
  const today = parseDateOnly(storeToday());
  const maxDate = new Date(today.getTime() + settings.maxAdvanceDays * 86_400_000);

  let closedReason: string | null = null;
  if (date < today) closedReason = "La fecha ya pasó.";
  else if (date > maxDate) closedReason = `Solo aceptamos pedidos con hasta ${settings.maxAdvanceDays} días de anticipación.`;
  else if (settings.closedWeekdays.includes(date.getUTCDay())) closedReason = "No hay servicio ese día de la semana.";
  else {
    const blocked = await tx.blockedDate.findUnique({ where: { date } });
    if (blocked) closedReason = blocked.reason ? `Día no disponible: ${blocked.reason}` : "Día no disponible.";
  }

  const slots = await tx.deliverySlot.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] });
  const counts = await tx.order.groupBy({
    by: ["requestedSlot"],
    where: { requestedDate: date, status: { not: "CANCELLED" } },
    _count: { _all: true },
  });
  const used = new Map(counts.map((c) => [c.requestedSlot, c._count._all]));
  const earliest = Date.now() + leadHours * 3_600_000;

  return {
    date: toDateOnly(date),
    closedReason,
    slots: slots.map((s) => {
      const remaining = Math.max(0, s.capacity - (used.get(s.id) ?? 0));
      const meetsLead = storeLocalToUtc(dateStr, s.startTime).getTime() >= earliest;
      return {
        id: s.id,
        label: s.label,
        remaining,
        available: !closedReason && remaining > 0 && meetsLead,
        reason: closedReason ?? (!meetsLead ? "Requiere más tiempo de anticipación." : remaining === 0 ? "Cupo lleno." : null),
      };
    }),
  };
}

/** Valida fecha y franja para un pedido; lanza error descriptivo si no es válida. */
export async function assertSlotAvailable(dateStr: string, slotId: string, leadHours: number, tx: Tx = prisma) {
  const result = await slotsForDate(dateStr, leadHours, tx);
  if (result.closedReason) throw badRequest(result.closedReason);
  const slot = result.slots.find((s) => s.id === slotId);
  if (!slot) throw badRequest("El horario seleccionado no existe.");
  if (!slot.available) throw badRequest(slot.reason ?? "El horario seleccionado no está disponible.");
  return slot;
}
