import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { addressLine } from "../../components/AddressForm";
import { ConfirmDialog, ErrorState, LoadingButton, OrderStatusBadge, Pagination, PaymentStatusBadge, ProductImage, Spinner } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../hooks/useShop";
import { PageHeader, Table } from "../../layouts/AdminLayout";
import { longDate, money, ORDER_STATUS, PAYMENT_STATUS, shortDateTime } from "../../lib/format";
import { adminApi } from "../../services/api";
import type { Order, OrderStatus, Paginated, PaymentStatus } from "../../types";

interface Row { id: string; number: string; customer: { name: string; email: string }; itemCount: number; totalCents: number; status: OrderStatus; paymentStatus: PaymentStatus; deliveryMethod: string; requestedDate: string; requestedSlot: string; createdAt: string }

export function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const status = params.get("estado") ?? "";
  const payment = params.get("pago") ?? "";
  const page = Number(params.get("pagina") ?? 1);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "orders", params.toString()],
    queryFn: () => adminApi.get<Paginated<Row>>("/orders", { q: params.get("q") ?? undefined, status: status || undefined, payment: payment || undefined, page }),
  });
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); n.delete("pagina"); setParams(n); };

  return (
    <>
      <PageHeader title="Pedidos" subtitle="Consulta y actualiza el estado operativo de cada pedido." />
      <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); set("q", q.trim()); }}>
        <input aria-label="Buscar pedidos" className="campo max-w-xs" placeholder="Número (MF-000001), correo o apellido" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Estado" className="campo w-auto" value={status} onChange={(e) => set("estado", e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="Pago" className="campo w-auto" value={payment} onChange={(e) => set("pago", e.target.value)}>
          <option value="">Todos los pagos</option>
          {Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-secundario">Buscar</button>
      </form>
      {isLoading ? <Spinner /> : isError || !data ? <ErrorState message="No pudimos cargar los pedidos." onRetry={refetch} /> : (
        <>
          <Table head={["Pedido", "Cliente", "Entrega solicitada", "Estado", "Pago", "Total"]} empty={!data.items.length}>
            {data.items.map((o) => (
              <tr key={o.id} className="hover:bg-crema-50">
                <td className="px-4 py-3"><Link to={`/admin/pedidos/${o.id}`} className="font-bold text-rosa-600 hover:underline">{o.number}</Link><p className="text-xs text-cafe-400">{shortDateTime(o.createdAt)}</p></td>
                <td className="px-4 py-3">{o.customer.name}<p className="text-xs text-cafe-400">{o.customer.email}</p></td>
                <td className="px-4 py-3">{o.requestedDate} · {o.requestedSlot}<p className="text-xs text-cafe-400">{o.deliveryMethod === "PICKUP" ? "Recoger" : "Domicilio"} · {o.itemCount} art.</p></td>
                <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                <td className="px-4 py-3"><PaymentStatusBadge status={o.paymentStatus} /></td>
                <td className="px-4 py-3 font-semibold">{money(o.totalCents)}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set("pagina", String(p))} />
        </>
      )}
    </>
  );
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  CONFIRMED: ["IN_PREPARATION", "CANCELLED"],
  IN_PREPARATION: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "READY"],
  DELIVERED: [],
  CANCELLED: [],
};
const ACTION_LABEL: Record<string, string> = { IN_PREPARATION: "Iniciar preparación", READY: "Marcar como listo", OUT_FOR_DELIVERY: "Enviar a domicilio", DELIVERED: "Marcar como entregado", CANCELLED: "Cancelar pedido" };

type AdminOrder = Omit<Order, "payments"> & {
  adminNotes: string | null;
  customer: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
  payments: { id: string; status: PaymentStatus; amountCents: number; refundedCents: number; stripePaymentIntentId: string | null; stripeCheckoutSessionId: string; createdAt: string }[];
  history: { action: string; details: Record<string, unknown> | null; createdAt: string; by: string }[];
};

export function AdminOrderDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const notify = useToast();
  const { data: o, isLoading, isError } = useQuery({ queryKey: ["admin", "order", id], queryFn: () => adminApi.get<{ order: AdminOrder }>(`/orders/${id}`).then((r) => r.order) });
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const [pending, setPending] = useState<OrderStatus | null>(null);
  useEffect(() => { if (o) { setNotes(o.adminNotes ?? ""); setConfirmed(o.confirmedDate ?? o.requestedDate); } }, [o]);

  const status = useMutation({
    mutationFn: (s: OrderStatus) => adminApi.send<{ order: AdminOrder }>("PATCH", `/orders/${id}/status`, { status: s, ...(s === "IN_PREPARATION" && confirmed && { confirmedDate: confirmed }) }),
    onSuccess: (r) => { qc.setQueryData(["admin", "order", id], r.order); qc.invalidateQueries({ queryKey: ["admin", "orders"] }); setPending(null); notify("Estado actualizado."); },
    onError: (e) => { notify(errorMessage(e), "error"); setPending(null); },
  });
  const saveNotes = useMutation({
    mutationFn: () => adminApi.send("PATCH", `/orders/${id}/notes`, { adminNotes: notes }),
    onSuccess: () => notify("Notas guardadas."),
    onError: (e) => notify(errorMessage(e), "error"),
  });

  if (isLoading) return <Spinner />;
  if (isError || !o) return <ErrorState message="No pudimos cargar el pedido." />;
  const next = TRANSITIONS[o.status].filter((s) => s !== "OUT_FOR_DELIVERY" || o.deliveryMethod === "DELIVERY");

  return (
    <>
      <PageHeader title={`Pedido ${o.number}`} subtitle={`Creado el ${shortDateTime(o.createdAt)}`} actions={<Link to="/admin/pedidos" className="btn-fantasma">Volver</Link>} />
      <div className="mb-6 flex flex-wrap items-center gap-2"><OrderStatusBadge status={o.status} /><PaymentStatusBadge status={o.paymentStatus} /></div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="tarjeta p-5">
            <h2 className="mb-4 text-lg">Productos</h2>
            <ul className="divide-y divide-crema-100">
              {o.items?.map((i) => (
                <li key={i.id} className="flex gap-4 py-3 text-sm">
                  <ProductImage src={i.imageUrl} alt="" className="size-14 shrink-0 rounded-lg" />
                  <div className="flex-1">
                    <p className="font-bold">{i.productName} × {i.quantity}</p>
                    {i.variantName && <p className="text-cafe-500">{i.variantName}</p>}
                    {i.customizations.map((c, k) => <p key={k} className="text-xs"><span className="font-semibold">{c.optionName}:</span> {c.value}{c.priceDeltaCents ? ` (+${money(c.priceDeltaCents)})` : ""}</p>)}
                  </div>
                  <div className="text-right"><p className="font-bold">{money(i.lineTotalCents)}</p><p className="text-xs text-cafe-400">{money(i.unitPriceCents)} c/u</p></div>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-crema-200 pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.subtotalCents)}</dd></div>
              {o.discountCents > 0 && <div className="flex justify-between"><dt>Descuento ({o.couponCode})</dt><dd>−{money(o.discountCents)}</dd></div>}
              <div className="flex justify-between"><dt>Envío</dt><dd>{money(o.shippingCents)}</dd></div>
              {o.taxCents > 0 && <div className="flex justify-between"><dt>Impuestos</dt><dd>{money(o.taxCents)}</dd></div>}
              <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{money(o.totalCents)}</dd></div>
            </dl>
            {o.customerNotes && <p className="mt-4 rounded-xl bg-crema-100 p-3 text-sm"><strong>Notas del cliente:</strong> {o.customerNotes}</p>}
          </section>

          <section className="tarjeta p-5">
            <h2 className="mb-3 text-lg">Pagos</h2>
            {o.payments.length === 0 ? <p className="text-sm text-cafe-500">Sin intentos de pago.</p> : (
              <ul className="space-y-2 text-sm">
                {o.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-crema-50 p-3">
                    <PaymentStatusBadge status={p.status} />
                    <span className="font-semibold">{money(p.amountCents)}</span>
                    {p.refundedCents > 0 && <span className="text-xs">Reembolsado {money(p.refundedCents)}</span>}
                    <span className="ml-auto font-mono text-xs text-cafe-400">{p.stripePaymentIntentId ?? p.stripeCheckoutSessionId}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-cafe-400">El estado de pago solo cambia con la confirmación de Stripe. Los reembolsos se gestionan en <Link to="/admin/pagos" className="font-bold text-rosa-600">Pagos</Link>.</p>
          </section>

          <section className="tarjeta p-5">
            <h2 className="mb-3 text-lg">Historial</h2>
            <ol className="space-y-2 text-sm">
              {o.history.map((h, i) => (
                <li key={i} className="flex flex-wrap gap-2">
                  <span className="text-cafe-400">{shortDateTime(h.createdAt)}</span>
                  <span className="font-semibold">{h.by}</span>
                  <span>{h.action === "order.status" && h.details ? `cambió el estado: ${ORDER_STATUS[h.details.from as OrderStatus]} → ${ORDER_STATUS[h.details.to as OrderStatus]}` : h.action}</span>
                </li>
              ))}
              {o.history.length === 0 && <li className="text-cafe-500">Sin cambios registrados.</li>}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="tarjeta space-y-3 p-5">
            <h2 className="text-lg">Estado operativo</h2>
            {next.includes("IN_PREPARATION") && (
              <div>
                <label htmlFor="fconf" className="etiqueta">Fecha confirmada de entrega</label>
                <input id="fconf" type="date" className="campo" value={confirmed} onChange={(e) => setConfirmed(e.target.value)} />
              </div>
            )}
            {next.length === 0 ? <p className="text-sm text-cafe-500">Este pedido ya no admite cambios de estado.</p> : (
              <div className="flex flex-col gap-2">
                {next.map((s) => (
                  <button key={s} className={s === "CANCELLED" ? "btn-fantasma text-error" : "btn-primario"} onClick={() => setPending(s)} disabled={status.isPending}>{ACTION_LABEL[s] ?? ORDER_STATUS[s]}</button>
                ))}
              </div>
            )}
            {o.status === "PENDING_PAYMENT" && <p className="text-xs text-cafe-400">Un pedido pendiente no puede marcarse como pagado manualmente: se confirma solo cuando Stripe verifica el pago.</p>}
          </section>
          <section className="tarjeta p-5 text-sm">
            <h2 className="mb-2 text-lg">Cliente</h2>
            <p className="font-semibold">{o.customer.firstName} {o.customer.lastName}</p>
            <p><a className="text-rosa-600 hover:underline" href={`mailto:${o.customer.email}`}>{o.customer.email}</a></p>
            {o.customer.phone && <p>{o.customer.phone}</p>}
            <Link to={`/admin/clientes/${o.customer.id}`} className="mt-2 inline-block text-xs font-bold text-rosa-600 hover:underline">Ver historial del cliente</Link>
          </section>
          <section className="tarjeta p-5 text-sm">
            <h2 className="mb-2 text-lg">Entrega</h2>
            <p className="font-semibold">{o.deliveryMethod === "PICKUP" ? "Recoger en tienda" : "Entrega a domicilio"}</p>
            <p>Solicitada: {longDate(o.requestedDate)} · {o.requestedSlot}</p>
            {o.confirmedDate && <p className="font-semibold text-exito">Confirmada: {longDate(o.confirmedDate)}</p>}
            {o.address && <p className="mt-2 text-cafe-500">{o.address.recipient} · {o.address.phone}<br />{addressLine(o.address)}{o.address.references && <><br />Ref.: {o.address.references}</>}</p>}
          </section>
          <section className="tarjeta space-y-3 p-5">
            <h2 className="text-lg">Notas internas</h2>
            <label htmlFor="notas-admin" className="sr-only">Notas internas</label>
            <textarea id="notas-admin" className="campo" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Solo visibles para administración" />
            <LoadingButton loading={saveNotes.isPending} className="btn-secundario btn-sm" onClick={() => saveNotes.mutate()}>Guardar notas</LoadingButton>
          </section>
        </div>
      </div>
      <ConfirmDialog
        open={!!pending}
        title={pending === "CANCELLED" ? "¿Cancelar el pedido?" : `¿${pending ? ACTION_LABEL[pending] : ""}?`}
        danger={pending === "CANCELLED"}
        loading={status.isPending}
        onConfirm={() => pending && status.mutate(pending)}
        onClose={() => setPending(null)}
      >
        {pending === "CANCELLED" && (o.paymentStatus === "PAID" ? "El pedido está pagado: después de cancelarlo, registra el reembolso en Pagos si corresponde." : "Se liberarán los productos apartados.")}
      </ConfirmDialog>
    </>
  );
}
