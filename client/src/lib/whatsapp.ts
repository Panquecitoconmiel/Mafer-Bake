import { money } from "./format";
import type { Cart } from "../types";

/** Enlace de WhatsApp con mensaje. Sin número configurado, WhatsApp deja elegir el contacto. */
export function whatsappLink(phone: string | null | undefined, text: string) {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) digits = `52${digits}`; // número de México sin lada de país
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function cartMessage(cart: Cart, storeName = "Mafer") {
  const lines = cart.items.map((it) => {
    const extra = [it.variantName, ...it.customizations.map((c) => `${c.optionName}: ${c.value}`)].filter(Boolean).join(" · ");
    return `• ${it.quantity} × ${it.product.name}${extra ? ` (${extra})` : ""} — ${money(it.lineTotalCents)}`;
  });
  return [`¡Hola, ${storeName}! Quiero hacer este pedido:`, "", ...lines, "", `Subtotal: ${money(cart.subtotalCents)}`, "", "¿Me confirman disponibilidad, fecha de entrega y forma de pago?"].join("\n");
}
