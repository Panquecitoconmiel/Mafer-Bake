import { Clock, Mail, MapPin, MessageCircle, Phone, Truck } from "lucide-react";
import { money } from "../lib/format";
import type { StoreSettings } from "../types";

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Información de pedidos y entregas, generada a partir de la configuración real de la tienda. */
export function DeliveryInfo({ s }: { s: StoreSettings }) {
  const days = Math.ceil(s.minLeadHours / 24);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="tarjeta p-6">
        <MapPin className="mb-3 size-6 text-rosa-600" />
        <h3 className="text-lg">Recoger en tienda</h3>
        {s.pickupEnabled ? (
          <p className="mt-2 text-sm text-cafe-500">
            {s.pickupAddress ? <>Recoge tu pedido en <strong className="text-cafe-700">{s.pickupAddress}</strong> en la fecha y horario que elijas.</> : "Disponible. La dirección de recogida se mostrará en la confirmación de tu pedido."}
          </p>
        ) : (
          <p className="mt-2 text-sm text-cafe-500">Por el momento no está disponible.</p>
        )}
      </div>
      <div className="tarjeta p-6">
        <Truck className="mb-3 size-6 text-rosa-600" />
        <h3 className="text-lg">Entrega a domicilio</h3>
        {s.deliveryEnabled && s.deliveryFeeCents != null ? (
          <p className="mt-2 text-sm text-cafe-500">
            Costo de envío: <strong className="text-cafe-700">{money(s.deliveryFeeCents)}</strong>
            {s.freeDeliveryMinCents != null && <> · Gratis en compras desde {money(s.freeDeliveryMinCents)}</>}.
            {s.deliveryCoverage && <> Cobertura: {s.deliveryCoverage}</>}
          </p>
        ) : (
          <p className="mt-2 text-sm text-cafe-500">Muy pronto. Por ahora puedes recoger tu pedido en tienda.</p>
        )}
      </div>
      <div className="tarjeta p-6 sm:col-span-2">
        <Clock className="mb-3 size-6 text-rosa-600" />
        <h3 className="text-lg">Anticipación y horarios</h3>
        <p className="mt-2 text-sm text-cafe-500">
          Recibimos pedidos con al menos {s.minLeadHours < 24 ? `${s.minLeadHours} horas` : `${days} día${days > 1 ? "s" : ""}`} de anticipación y hasta {s.maxAdvanceDays} días antes.
          Algunos productos, como los pasteles personalizados, requieren más tiempo: lo verás en cada producto y al elegir la fecha.
          {s.closedWeekdays.length > 0 && <> No hay entregas los {s.closedWeekdays.map((d) => DAYS[d]).join(", ")}.</>}
          {s.businessHours && <> Horario de atención: {s.businessHours}.</>}
        </p>
      </div>
    </div>
  );
}

export function FAQ({ s }: { s: StoreSettings }) {
  const items = [
    {
      q: "¿Con cuánta anticipación debo hacer mi pedido?",
      a: `El mínimo general es de ${s.minLeadHours} horas. Cada producto indica su tiempo de preparación y el calendario de compra solo te mostrará fechas y horarios disponibles.`,
    },
    {
      q: "¿Cómo puedo pagar?",
      a: s.paymentsEnabled
        ? "Pagas en línea con tarjeta mediante Stripe, una plataforma de pagos segura. Mafer nunca ve ni guarda los datos de tu tarjeta."
        : "Estamos terminando de configurar el pago en línea con Stripe. Mientras tanto puedes armar tu carrito y crear tu cuenta.",
    },
    {
      q: "¿Puedo personalizar mi pastel?",
      a: "Sí. En los pasteles personalizados eliges sabor del pan, relleno, cobertura, decoración, colores, temática y mensaje. Cada opción muestra su costo adicional antes de agregarla.",
    },
    {
      q: "¿Hacen entregas a domicilio?",
      a: s.deliveryEnabled ? `Sí${s.deliveryCoverage ? `, en ${s.deliveryCoverage}` : ""}. El costo de envío se calcula al finalizar tu compra.` : "Por ahora solo entregamos en tienda. Te avisaremos cuando habilitemos el envío a domicilio.",
    },
    {
      q: "¿Puedo cancelar o modificar mi pedido?",
      a: s.cancellationPolicy ?? "Si tu pedido aún está pendiente de pago, puedes cancelarlo desde «Mis pedidos». Para pedidos pagados, contáctanos lo antes posible.",
    },
  ];
  return (
    <div className="divide-y divide-crema-200 rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-suave)]">
      {items.map((it) => (
        <details key={it.q} className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[17px] text-cafe-900">
            {it.q}
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-rosa-50 text-rosa-600 transition group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-cafe-500">{it.a}</p>
        </details>
      ))}
    </div>
  );
}

export function ContactInfo({ s }: { s: StoreSettings }) {
  const rows = [
    s.contactPhone && { Icon: Phone, label: s.contactPhone, href: `tel:${s.contactPhone.replace(/\s/g, "")}` },
    s.whatsapp && { Icon: MessageCircle, label: `WhatsApp ${s.whatsapp}`, href: `https://wa.me/${s.whatsapp.replace(/\D/g, "")}` },
    s.contactEmail && { Icon: Mail, label: s.contactEmail, href: `mailto:${s.contactEmail}` },
    s.pickupAddress && { Icon: MapPin, label: s.pickupAddress },
  ].filter(Boolean) as { Icon: typeof Phone; label: string; href?: string }[];

  if (rows.length === 0) {
    return <p className="text-sm text-cafe-500">Muy pronto publicaremos nuestros datos de contacto.</p>;
  }
  return (
    <ul className="space-y-3">
      {rows.map(({ Icon, label, href }) => (
        <li key={label} className="flex items-center gap-3 text-sm">
          <span className="grid size-9 place-items-center rounded-full bg-rosa-100 text-rosa-600"><Icon className="size-4" /></span>
          {href ? <a href={href} className="font-semibold hover:text-rosa-600" target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{label}</a> : <span className="font-semibold">{label}</span>}
        </li>
      ))}
    </ul>
  );
}
