import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CreditCard, Lock, MapPin, Store, Truck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AddressForm, addressLine } from "../components/AddressForm";
import { Alert, ErrorState, LoadingButton, ProductImage, Spinner } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { useCart, useStore } from "../hooks/useShop";
import { money, todayISO } from "../lib/format";
import { api, ApiError } from "../services/api";

type Method = "PICKUP" | "DELIVERY";

function Step({ n, title, icon, children }: { n: number; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="tarjeta p-5 sm:p-6" aria-labelledby={`paso-${n}`}>
      <h2 id={`paso-${n}`} className="mb-5 flex items-center gap-3 text-xl">
        <span className="grid size-8 place-items-center rounded-full bg-rosa-100 text-rosa-600">{icon}</span>
        <span><span className="sr-only">Paso {n}: </span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const notify = useToast();
  const qc = useQueryClient();
  const { data: store } = useStore();
  const { data: cart, isLoading: cartLoading } = useCart();
  const { data: addresses, refetch: refetchAddresses } = useQuery({ queryKey: ["addresses"], queryFn: api.addresses });

  const [method, setMethod] = useState<Method>("PICKUP");
  const [addressId, setAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [date, setDate] = useState("");
  const [slotId, setSlotId] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    if (store && !store.pickupEnabled && store.deliveryEnabled) setMethod("DELIVERY");
  }, [store]);
  useEffect(() => {
    if (!addressId && addresses?.length) setAddressId((addresses.find((a) => a.isDefault) ?? addresses[0]).id);
  }, [addresses, addressId]);

  const quoteBody = { deliveryMethod: method, addressId: method === "DELIVERY" ? addressId : null, couponCode: coupon };
  const { data: quote, isFetching: quoting, refetch: refetchQuote } = useQuery({
    queryKey: ["quote", quoteBody, cart?.subtotalCents],
    queryFn: () => api.quote(quoteBody),
    enabled: !!cart && cart.items.length > 0,
  });
  const { data: availability, isFetching: loadingSlots } = useQuery({
    queryKey: ["availability", date, cart?.itemCount],
    queryFn: () => api.availability(date),
    enabled: !!date,
  });
  useEffect(() => {
    setSlotId("");
  }, [date]);

  if (cartLoading || !store) return <Spinner className="py-24" />;
  if (!cart || cart.items.length === 0) return <Navigate to="/carrito" replace />;
  if (cart.hasIssues) return <Navigate to="/carrito" replace />;

  const minDate = todayISO(0);
  const maxDate = todayISO(store.maxAdvanceDays);
  const canDeliver = store.deliveryEnabled;
  const ready = !!date && !!slotId && terms && (method === "PICKUP" || !!addressId) && !!quote && !quoting && store.paymentsEnabled;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const order = await api.createOrder({
        deliveryMethod: method,
        addressId: method === "DELIVERY" ? addressId : null,
        requestedDate: date,
        slotId,
        couponCode: coupon,
        notes: notes || null,
        acceptTerms: true,
        idempotencyKey: idempotencyKey.current,
        expectedTotalCents: quote.totalCents,
      });
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      try {
        const { url } = await api.checkout(order.id);
        window.location.assign(url);
      } catch (err) {
        notify(err instanceof ApiError ? err.message : "No pudimos iniciar el pago.", "error");
        navigate(`/cuenta/pedidos/${order.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const code = (err.details as { code?: string } | undefined)?.code;
        if (code === "PRICE_CHANGED") {
          await refetchQuote();
          idempotencyKey.current = crypto.randomUUID();
        }
        if (code === "CART_ISSUES" || code === "OUT_OF_STOCK") qc.invalidateQueries({ queryKey: ["cart"] });
        setFormError(err.message);
      } else setFormError("No pudimos crear tu pedido. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  };

  return (
    <div className="contenedor pt-10">
      <h1 className="mb-2 text-4xl">Finalizar compra</h1>
      <p className="mb-8 text-cafe-500">Revisa los detalles de tu pedido antes de pagar.</p>
      {!store.paymentsEnabled && (
        <div className="mb-6"><Alert kind="aviso">El pago en línea aún no está habilitado en la tienda. Puedes revisar tu pedido, pero todavía no es posible pagarlo.</Alert></div>
      )}

      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Step n={1} title="Entrega" icon={<Truck className="size-4" />}>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Forma de entrega">
              {[
                { v: "PICKUP" as Method, label: "Recoger en tienda", desc: store.pickupAddress ?? "Sin costo de envío", Icon: Store, enabled: store.pickupEnabled },
                { v: "DELIVERY" as Method, label: "Entrega a domicilio", desc: canDeliver ? `Envío ${money(store.deliveryFeeCents ?? 0)}` : "No disponible por ahora", Icon: Truck, enabled: canDeliver },
              ].map((o) => (
                <label key={o.v} className={`flex items-start gap-3 rounded-2xl border p-4 transition ${!o.enabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${method === o.v ? "border-rosa-600 bg-rosa-50 ring-1 ring-rosa-600" : "border-crema-300 hover:border-empolvado"}`}>
                  <input type="radio" name="metodo" className="mt-1 accent-rosa-600" checked={method === o.v} disabled={!o.enabled} onChange={() => setMethod(o.v)} />
                  <span>
                    <span className="flex items-center gap-2 font-bold"><o.Icon className="size-4 text-rosa-600" />{o.label}</span>
                    <span className="mt-1 block text-sm text-cafe-500">{o.desc}</span>
                  </span>
                </label>
              ))}
            </div>
            {method === "DELIVERY" && (
              <div className="mt-5">
                <h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-bold"><MapPin className="size-4 text-rosa-600" /> Dirección de entrega</h3>
                {addingAddress || !addresses?.length ? (
                  <AddressForm
                    onSaved={async (a) => {
                      await refetchAddresses();
                      setAddressId(a.id);
                      setAddingAddress(false);
                    }}
                    onCancel={addresses?.length ? () => setAddingAddress(false) : undefined}
                  />
                ) : (
                  <div className="space-y-2">
                    {addresses.map((a) => (
                      <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${addressId === a.id ? "border-rosa-600 bg-rosa-50" : "border-crema-300"}`}>
                        <input type="radio" name="direccion" className="mt-1 accent-rosa-600" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                        <span><strong>{a.label}</strong> · {a.recipient}<br /><span className="text-cafe-500">{addressLine(a)}</span></span>
                      </label>
                    ))}
                    <button type="button" className="btn-fantasma btn-sm" onClick={() => setAddingAddress(true)}>+ Agregar otra dirección</button>
                  </div>
                )}
              </div>
            )}
          </Step>

          <Step n={2} title="Fecha y horario" icon={<CalendarDays className="size-4" />}>
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <div>
                <label htmlFor="fecha" className="etiqueta">Fecha solicitada <span className="text-rosa-600">*</span></label>
                <input id="fecha" type="date" className="campo" min={minDate} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} required />
                {quote && <p className="ayuda">Tu pedido requiere al menos {quote.leadHours} h de anticipación.</p>}
              </div>
              <fieldset>
                <legend className="etiqueta">Horario <span className="text-rosa-600">*</span></legend>
                {!date ? (
                  <p className="text-sm text-cafe-400">Elige una fecha para ver los horarios disponibles.</p>
                ) : loadingSlots ? (
                  <Spinner className="py-3" label="Consultando disponibilidad…" />
                ) : availability?.closedReason ? (
                  <p className="text-sm font-semibold text-error">{availability.closedReason}</p>
                ) : availability?.slots.length ? (
                  <div className="flex flex-wrap gap-2">
                    {availability.slots.map((s) => (
                      <button type="button" key={s.id} className="chip disabled:cursor-not-allowed disabled:opacity-45" aria-pressed={slotId === s.id} disabled={!s.available} onClick={() => setSlotId(s.id)} title={s.reason ?? undefined}>
                        {s.label}
                        {!s.available && <span className="text-[11px] font-normal">· {s.reason}</span>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-cafe-500">No hay horarios configurados. Contáctanos para coordinar tu pedido.</p>
                )}
              </fieldset>
            </div>
            <p className="mt-4 text-xs text-cafe-400">Es la fecha que solicitas; Mafer la confirmará al preparar tu pedido.</p>
          </Step>

          <Step n={3} title="Detalles adicionales" icon={<CreditCard className="size-4" />}>
            <div className="grid gap-4">
              <div>
                <label htmlFor="cupon" className="etiqueta">Cupón de descuento</label>
                <div className="flex gap-2">
                  <input id="cupon" className="campo uppercase" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Escribe tu código" />
                  {coupon ? (
                    <button type="button" className="btn-secundario" onClick={() => { setCoupon(null); setCouponInput(""); }}>Quitar</button>
                  ) : (
                    <button type="button" className="btn-secundario" disabled={!couponInput.trim()} onClick={() => setCoupon(couponInput.trim().toUpperCase())}>Aplicar</button>
                  )}
                </div>
                {quote?.couponError && <p className="error-campo">{quote.couponError}</p>}
                {quote?.couponCode && <p className="mt-1 text-xs font-bold text-exito">Cupón {quote.couponCode} aplicado.</p>}
              </div>
              <div>
                <label htmlFor="notas" className="etiqueta">Notas para Mafer</label>
                <textarea id="notas" className="campo" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alergias, indicaciones de entrega…" />
              </div>
            </div>
          </Step>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-32">
          <div className="tarjeta p-6">
            <h2 className="text-xl">Tu pedido</h2>
            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {cart.items.map((i) => (
                <li key={i.id} className="flex gap-3 text-sm">
                  <ProductImage src={i.product.image} alt="" className="size-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{i.product.name} <span className="text-cafe-400">× {i.quantity}</span></p>
                    {i.variantName && <p className="text-xs text-cafe-500">{i.variantName}</p>}
                  </div>
                  <span className="font-semibold">{money(i.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            {!quote ? (
              <Spinner className="py-4" label="Calculando…" />
            ) : (
              <dl className="mt-5 space-y-2 border-t border-crema-200 pt-4 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(quote.subtotalCents)}</dd></div>
                {quote.discountCents > 0 && <div className="flex justify-between text-exito"><dt>Descuento</dt><dd>−{money(quote.discountCents)}</dd></div>}
                <div className="flex justify-between"><dt>Envío</dt><dd>{method === "PICKUP" ? "Sin costo" : money(quote.shippingCents)}</dd></div>
                {quote.taxCents > 0 && <div className="flex justify-between"><dt>Impuestos</dt><dd>{money(quote.taxCents)}</dd></div>}
                <div className="flex justify-between border-t border-crema-200 pt-3 text-lg font-bold text-cafe-900"><dt>Total</dt><dd>{money(quote.totalCents)}</dd></div>
                {quote.pricesIncludeTax && <p className="text-xs text-cafe-400">Precios con impuestos incluidos.</p>}
              </dl>
            )}
            <label className="mt-5 flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-rosa-600" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>Acepto las <Link to="/legal/compras" target="_blank" className="font-bold text-rosa-600 hover:underline">condiciones de compra</Link> y el <Link to="/legal/privacidad" target="_blank" className="font-bold text-rosa-600 hover:underline">aviso de privacidad</Link>.</span>
            </label>
            {formError && <div className="mt-4"><Alert kind="error">{formError}</Alert></div>}
            <LoadingButton type="submit" loading={submitting} disabled={!ready} className="btn-primario mt-5 w-full">
              <Lock className="size-4" /> {submitting ? "Preparando el pago…" : "Confirmar y pagar"}
            </LoadingButton>
            {!ready && !submitting && (
              <p className="mt-2 text-center text-xs text-cafe-400">
                {!store.paymentsEnabled ? "Pago en línea no disponible por el momento." : !date || !slotId ? "Elige fecha y horario." : !terms ? "Acepta las condiciones para continuar." : method === "DELIVERY" && !addressId ? "Agrega una dirección de entrega." : ""}
              </p>
            )}
            <p className="mt-4 text-center text-xs text-cafe-400">Serás redirigido a Stripe para pagar de forma segura.</p>
          </div>
        </aside>
      </form>
      {quote?.hasIssues && <ErrorState message="Algunos artículos cambiaron. Revisa tu carrito." />}
    </div>
  );
}
