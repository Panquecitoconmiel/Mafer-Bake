import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Alert, ConfirmDialog, ErrorState, Field, LoadingButton, OrderStatusBadge, Pagination, PaymentStatusBadge, Select, Spinner } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../hooks/useShop";
import { PageHeader, Table } from "../../layouts/AdminLayout";
import { money, parseMoney, PAYMENT_STATUS, shortDate, shortDateTime } from "../../lib/format";
import { adminApi, ApiError } from "../../services/api";
import type { OrderStatus, Paginated, PaymentStatus } from "../../types";

// ───────── Categorías ─────────

interface Cat { id: string; name: string; slug: string; description: string | null; sortOrder: number; isActive: boolean; _count: { products: number } }

export function AdminCategories() {
  const qc = useQueryClient();
  const notify = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "categories"], queryFn: () => adminApi.get<{ items: Cat[] }>("/categories").then((r) => r.items) });
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);
  const [toDelete, setToDelete] = useState<Cat | null>(null);
  const save = useMutation({
    mutationFn: (c: Partial<Cat>) => {
      const body = { name: c.name, ...(c.slug && { slug: c.slug }), description: c.description || null, sortOrder: Number(c.sortOrder) || 0, isActive: c.isActive ?? true };
      return c.id ? adminApi.send("PUT", `/categories/${c.id}`, body) : adminApi.send("POST", "/categories", body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); setEditing(null); notify("Categoría guardada."); },
    onError: (e) => notify(errorMessage(e), "error"),
  });
  const del = useMutation({
    mutationFn: (id: string) => adminApi.send("DELETE", `/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "categories"] }); setToDelete(null); notify("Categoría eliminada."); },
    onError: (e) => { notify(errorMessage(e), "error"); setToDelete(null); },
  });

  return (
    <>
      <PageHeader title="Categorías" actions={<button className="btn-primario" onClick={() => setEditing({ isActive: true, sortOrder: (data?.length ?? 0) + 1 })}><Plus className="size-4" /> Nueva categoría</button>} />
      {editing && (
        <form className="tarjeta mb-6 grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }}>
          <Field label="Nombre" required value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <Field label="Slug (URL)" placeholder="se genera desde el nombre" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
          <div className="sm:col-span-2"><Field label="Descripción" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
          <Field label="Orden" inputMode="numeric" value={String(editing.sortOrder ?? 0)} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} />
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" className="size-5 accent-rosa-600" checked={editing.isActive ?? true} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Visible en la tienda</label>
          <div className="flex gap-2 sm:col-span-2"><LoadingButton type="submit" loading={save.isPending}>Guardar</LoadingButton><button type="button" className="btn-fantasma" onClick={() => setEditing(null)}>Cancelar</button></div>
        </form>
      )}
      {isLoading ? <Spinner /> : (
        <Table head={["Nombre", "Slug", "Productos", "Orden", "Estado", ""]} empty={!data?.length}>
          {data?.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-semibold">{c.name}</td>
              <td className="px-4 py-3 text-cafe-500">/{c.slug}</td>
              <td className="px-4 py-3">{c._count.products}</td>
              <td className="px-4 py-3">{c.sortOrder}</td>
              <td className="px-4 py-3">{c.isActive ? "Visible" : <span className="text-cafe-400">Oculta</span>}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button className="btn-secundario btn-sm" onClick={() => setEditing(c)}>Editar</button>
                <button className="btn-fantasma btn-sm text-error" onClick={() => setToDelete(c)} disabled={c._count.products > 0} title={c._count.products ? "Tiene productos" : undefined}>Eliminar</button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <ConfirmDialog open={!!toDelete} title={`¿Eliminar «${toDelete?.name}»?`} danger confirmLabel="Eliminar" loading={del.isPending} onConfirm={() => toDelete && del.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </>
  );
}

// ───────── Inventario ─────────

interface InvRow { id: string; name: string; inventoryMode: "TRACKED" | "MADE_TO_ORDER"; stock: number; lowStockThreshold: number; status: string; isAvailable: boolean }
interface Movement { id: string; type: string; quantity: number; stockAfter: number; reason: string; createdAt: string; product: { name: string }; user: { firstName: string; lastName: string } | null; order: { number: number } | null }
const MOVE_LABEL: Record<string, string> = { IN: "Entrada", OUT: "Salida", ADJUSTMENT: "Ajuste", RESERVATION: "Apartado", RELEASE: "Liberación" };

export function AdminInventory() {
  const qc = useQueryClient();
  const notify = useToast();
  const { data: items, isLoading } = useQuery({ queryKey: ["admin", "inventory"], queryFn: () => adminApi.get<{ items: InvRow[] }>("/inventory").then((r) => r.items) });
  const { data: moves } = useQuery({ queryKey: ["admin", "movements"], queryFn: () => adminApi.get<{ items: Movement[] }>("/inventory/movements").then((r) => r.items) });
  const [adjust, setAdjust] = useState<{ product: InvRow; type: "IN" | "OUT" | "ADJUSTMENT"; quantity: string; reason: string } | null>(null);
  const m = useMutation({
    mutationFn: () => adminApi.send("POST", `/inventory/${adjust!.product.id}/adjust`, { type: adjust!.type, quantity: Number(adjust!.quantity), reason: adjust!.reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); setAdjust(null); notify("Inventario actualizado."); },
    onError: (e) => notify(errorMessage(e), "error"),
  });
  const tracked = items?.filter((i) => i.inventoryMode === "TRACKED") ?? [];

  return (
    <>
      <PageHeader title="Inventario" subtitle="Existencias de productos cuantificables. Los productos bajo pedido no manejan existencias." />
      {adjust && (
        <form className="tarjeta mb-6 grid gap-4 p-5 sm:grid-cols-4" onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate(); }}>
          <p className="font-display text-lg sm:col-span-4">{adjust.product.name} · existencias actuales: {adjust.product.stock}</p>
          <Select label="Movimiento" value={adjust.type} onChange={(e) => setAdjust({ ...adjust, type: e.target.value as "IN" })}>
            <option value="IN">Entrada (+)</option>
            <option value="OUT">Salida (−)</option>
            <option value="ADJUSTMENT">Ajuste (±)</option>
          </Select>
          <Field label="Cantidad" inputMode="numeric" required value={adjust.quantity} onChange={(e) => setAdjust({ ...adjust, quantity: e.target.value })} hint={adjust.type === "ADJUSTMENT" ? "Usa negativo para restar." : undefined} />
          <div className="sm:col-span-2"><Field label="Motivo" required value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} placeholder="Producción del día, merma…" /></div>
          <div className="flex gap-2 sm:col-span-4"><LoadingButton type="submit" loading={m.isPending}>Registrar</LoadingButton><button type="button" className="btn-fantasma" onClick={() => setAdjust(null)}>Cancelar</button></div>
        </form>
      )}
      {isLoading ? <Spinner /> : (
        <Table head={["Producto", "Existencias", "Mínimo", "Estado", ""]} empty={!tracked.length}>
          {tracked.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-semibold">{p.name}</td>
              <td className={`px-4 py-3 font-bold ${p.stock <= p.lowStockThreshold ? "text-aviso" : ""}`}>{p.stock}{p.stock === 0 && <span className="ml-1 text-xs text-error">Agotado</span>}</td>
              <td className="px-4 py-3">{p.lowStockThreshold}</td>
              <td className="px-4 py-3 text-cafe-500">{p.status === "PUBLISHED" ? "Publicado" : p.status === "DRAFT" ? "Borrador" : p.status}</td>
              <td className="px-4 py-3 text-right"><button className="btn-secundario btn-sm" onClick={() => setAdjust({ product: p, type: "IN", quantity: "", reason: "" })}>Registrar movimiento</button></td>
            </tr>
          ))}
        </Table>
      )}
      <h2 className="mt-8 mb-3 text-xl">Movimientos recientes</h2>
      <Table head={["Fecha", "Producto", "Tipo", "Cantidad", "Resultado", "Motivo", "Por"]} empty={!moves?.length}>
        {moves?.map((mv) => (
          <tr key={mv.id}>
            <td className="px-4 py-2 text-cafe-500">{shortDateTime(mv.createdAt)}</td>
            <td className="px-4 py-2">{mv.product.name}</td>
            <td className="px-4 py-2">{MOVE_LABEL[mv.type] ?? mv.type}</td>
            <td className={`px-4 py-2 font-bold ${mv.quantity < 0 ? "text-error" : "text-exito"}`}>{mv.quantity > 0 ? `+${mv.quantity}` : mv.quantity}</td>
            <td className="px-4 py-2">{mv.stockAfter}</td>
            <td className="px-4 py-2">{mv.reason}</td>
            <td className="px-4 py-2 text-cafe-500">{mv.user ? `${mv.user.firstName} ${mv.user.lastName}` : mv.order ? "Sistema (pedido)" : "Sistema"}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

// ───────── Clientes ─────────

interface Customer { id: string; firstName: string; lastName: string; email: string; phone: string | null; isActive: boolean; emailVerifiedAt: string | null; createdAt: string; _count: { orders: number } }

export function AdminCustomers() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const page = Number(params.get("pagina") ?? 1);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["admin", "customers", params.toString()], queryFn: () => adminApi.get<Paginated<Customer>>("/customers", { q: params.get("q") ?? undefined, page }) });
  return (
    <>
      <PageHeader title="Clientes" />
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setParams(q ? { q } : {}); }}>
        <input aria-label="Buscar clientes" className="campo max-w-xs" placeholder="Nombre o correo" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-secundario">Buscar</button>
      </form>
      {isLoading ? <Spinner /> : isError || !data ? <ErrorState message="No pudimos cargar los clientes." onRetry={refetch} /> : (
        <>
          <Table head={["Cliente", "Correo", "Pedidos", "Alta", "Estado"]} empty={!data.items.length}>
            {data.items.map((c) => (
              <tr key={c.id} className="hover:bg-crema-50">
                <td className="px-4 py-3"><Link to={`/admin/clientes/${c.id}`} className="font-semibold text-rosa-600 hover:underline">{c.firstName} {c.lastName}</Link></td>
                <td className="px-4 py-3">{c.email}{!c.emailVerifiedAt && <span className="ml-1 text-xs text-cafe-400">(sin verificar)</span>}</td>
                <td className="px-4 py-3">{c._count.orders}</td>
                <td className="px-4 py-3 text-cafe-500">{shortDate(c.createdAt)}</td>
                <td className="px-4 py-3">{c.isActive ? "Activa" : <span className="font-semibold text-error">Desactivada</span>}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => setParams({ ...Object.fromEntries(params), pagina: String(p) })} />
        </>
      )}
    </>
  );
}

export function AdminCustomerDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const notify = useToast();
  const [confirm, setConfirm] = useState(false);
  const { data: c, isLoading } = useQuery({
    queryKey: ["admin", "customer", id],
    queryFn: () => adminApi.get<{ customer: Customer & { addresses: { id: string; label: string; city: string }[]; orders: { id: string; number: string; totalCents: number; status: OrderStatus; paymentStatus: PaymentStatus; createdAt: string }[] } }>(`/customers/${id}`).then((r) => r.customer),
  });
  const toggle = useMutation({
    mutationFn: () => adminApi.send("PATCH", `/customers/${id}/active`, { isActive: !c!.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "customer", id] }); setConfirm(false); notify("Cuenta actualizada."); },
    onError: (e) => notify(errorMessage(e), "error"),
  });
  if (isLoading || !c) return <Spinner />;
  return (
    <>
      <PageHeader title={`${c.firstName} ${c.lastName}`} subtitle={`Cliente desde ${shortDate(c.createdAt)}`} actions={<>
        <Link to="/admin/clientes" className="btn-fantasma">Volver</Link>
        <button className={c.isActive ? "btn-fantasma text-error" : "btn-secundario"} onClick={() => setConfirm(true)}>{c.isActive ? "Desactivar cuenta" : "Reactivar cuenta"}</button>
      </>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section className="tarjeta p-5 text-sm">
          <h2 className="mb-2 text-lg">Contacto</h2>
          <p><a href={`mailto:${c.email}`} className="text-rosa-600 hover:underline">{c.email}</a></p>
          <p>{c.phone ?? "Sin teléfono"}</p>
          <p className="mt-2">{c.emailVerifiedAt ? "Correo verificado" : "Correo sin verificar"}</p>
          <h3 className="mt-4 mb-1 font-sans font-bold">Direcciones</h3>
          {c.addresses.length ? c.addresses.map((a) => <p key={a.id}>{a.label} · {a.city}</p>) : <p className="text-cafe-500">Ninguna</p>}
        </section>
        <section>
          <h2 className="mb-3 text-lg">Pedidos</h2>
          <Table head={["Pedido", "Fecha", "Estado", "Pago", "Total"]} empty={!c.orders.length}>
            {c.orders.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3"><Link to={`/admin/pedidos/${o.id}`} className="font-bold text-rosa-600 hover:underline">{o.number}</Link></td>
                <td className="px-4 py-3">{shortDate(o.createdAt)}</td>
                <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                <td className="px-4 py-3"><PaymentStatusBadge status={o.paymentStatus} /></td>
                <td className="px-4 py-3 font-semibold">{money(o.totalCents)}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
      <ConfirmDialog open={confirm} title={c.isActive ? "¿Desactivar esta cuenta?" : "¿Reactivar esta cuenta?"} danger={c.isActive} loading={toggle.isPending} onConfirm={() => toggle.mutate()} onClose={() => setConfirm(false)}>
        {c.isActive ? "La persona no podrá iniciar sesión y se cerrarán sus sesiones abiertas. Su historial se conserva." : undefined}
      </ConfirmDialog>
    </>
  );
}

// ───────── Pagos y reembolsos ─────────

interface PaymentRow { id: string; orderId: string; orderNumber: string; customer: string; amountCents: number; refundedCents: number; currency: string; status: PaymentStatus; stripeRef: string; createdAt: string; refunds: { id: string; amountCents: number; status: string; reason: string | null; createdAt: string }[] }

export function AdminPayments() {
  const qc = useQueryClient();
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get("estado") ?? "";
  const page = Number(params.get("pagina") ?? 1);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "payments", params.toString()], queryFn: () => adminApi.get<Paginated<PaymentRow>>("/payments", { status: status || undefined, page }) });
  const [refund, setRefund] = useState<{ p: PaymentRow; amount: string; reason: string } | null>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const m = useMutation({
    mutationFn: () => {
      const cents = parseMoney(refund!.amount);
      if (!cents) throw new ApiError(400, "Indica un monto válido.");
      return adminApi.send("POST", `/payments/${refund!.p.id}/refunds`, { amountCents: cents, reason: refund!.reason || undefined, confirm: true });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); setRefund(null); setConfirmRefund(false); notify("Reembolso solicitado a Stripe."); },
    onError: (e) => { notify(errorMessage(e), "error"); setConfirmRefund(false); },
  });

  return (
    <>
      <PageHeader title="Pagos" subtitle="Pagos procesados por Stripe. Nunca se muestran datos de tarjetas." />
      <select aria-label="Filtrar por estado" className="campo mb-4 w-auto" value={status} onChange={(e) => setParams(e.target.value ? { estado: e.target.value } : {})}>
        <option value="">Todos</option>
        {Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {refund && (
        <form className="tarjeta mb-6 grid gap-4 p-5 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); setConfirmRefund(true); }}>
          <p className="font-display text-lg sm:col-span-3">Reembolso del pedido {refund.p.orderNumber} · disponible {money(refund.p.amountCents - refund.p.refundedCents)}</p>
          <Field label="Monto (MXN)" inputMode="decimal" required value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} />
          <div className="sm:col-span-2"><Field label="Motivo" value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} /></div>
          <p className="text-xs text-cafe-500 sm:col-span-3">El reembolso no devuelve existencias al inventario.</p>
          <div className="flex gap-2 sm:col-span-3"><button className="btn-peligro">Reembolsar</button><button type="button" className="btn-fantasma" onClick={() => setRefund(null)}>Cancelar</button></div>
        </form>
      )}
      {isLoading ? <Spinner /> : (
        <>
          <Table head={["Fecha", "Pedido", "Cliente", "Importe", "Estado", "Referencia Stripe", ""]} empty={!data?.items.length}>
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-cafe-500">{shortDateTime(p.createdAt)}</td>
                <td className="px-4 py-3"><Link to={`/admin/pedidos/${p.orderId}`} className="font-bold text-rosa-600 hover:underline">{p.orderNumber}</Link></td>
                <td className="px-4 py-3">{p.customer}</td>
                <td className="px-4 py-3 font-semibold">{money(p.amountCents)} <span className="text-xs text-cafe-400 uppercase">{p.currency}</span>{p.refundedCents > 0 && <p className="text-xs font-normal">Reembolsado {money(p.refundedCents)}</p>}</td>
                <td className="px-4 py-3"><PaymentStatusBadge status={p.status} /></td>
                <td className="px-4 py-3 font-mono text-xs text-cafe-500">{p.stripeRef}</td>
                <td className="px-4 py-3 text-right">{["PAID", "PARTIALLY_REFUNDED"].includes(p.status) && <button className="btn-secundario btn-sm" onClick={() => setRefund({ p, amount: ((p.amountCents - p.refundedCents) / 100).toFixed(2), reason: "" })}>Reembolsar</button>}</td>
              </tr>
            ))}
          </Table>
          {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(pg) => setParams({ ...Object.fromEntries(params), pagina: String(pg) })} />}
        </>
      )}
      <ConfirmDialog open={confirmRefund} title="Confirmar reembolso" danger confirmLabel="Sí, reembolsar" loading={m.isPending} onConfirm={() => m.mutate()} onClose={() => setConfirmRefund(false)}>
        Se reembolsarán {refund ? money(parseMoney(refund.amount) ?? 0) : ""} a la tarjeta del cliente mediante Stripe. Esta operación no se puede deshacer.
      </ConfirmDialog>
    </>
  );
}

// ───────── Cupones ─────────

interface Coupon { id: string; code: string; description: string | null; type: "PERCENT" | "FIXED"; value: number; minSubtotalCents: number | null; startsAt: string | null; endsAt: string | null; maxUses: number | null; maxUsesPerUser: number | null; usedCount: number; isActive: boolean }
const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

export function AdminCoupons() {
  const qc = useQueryClient();
  const notify = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "coupons"], queryFn: () => adminApi.get<{ items: Coupon[] }>("/coupons").then((r) => r.items) });
  const empty = { code: "", description: "", type: "PERCENT" as const, value: "", minSubtotal: "", startsAt: "", endsAt: "", maxUses: "", maxUsesPerUser: "", isActive: true };
  const [form, setForm] = useState<(typeof empty & { id?: string }) | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const save = useMutation({
    mutationFn: () => {
      const f = form!;
      const body = {
        code: f.code, description: f.description || null, type: f.type,
        value: f.type === "PERCENT" ? Number(f.value) : parseMoney(f.value) ?? 0,
        minSubtotalCents: f.minSubtotal ? parseMoney(f.minSubtotal) : null,
        startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null, endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
        maxUses: f.maxUses ? Number(f.maxUses) : null, maxUsesPerUser: f.maxUsesPerUser ? Number(f.maxUsesPerUser) : null, isActive: f.isActive,
      };
      return f.id ? adminApi.send("PUT", `/coupons/${f.id}`, body) : adminApi.send("POST", "/coupons", body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "coupons"] }); setForm(null); setErrors({}); notify("Cupón guardado."); },
    onError: (e) => { setErrors(e instanceof ApiError ? e.fieldErrors : {}); notify(errorMessage(e), "error"); },
  });
  const edit = (c: Coupon) => setForm({
    id: c.id, code: c.code, description: c.description ?? "", type: c.type as "PERCENT", value: c.type === "PERCENT" ? String(c.value) : (c.value / 100).toFixed(2),
    minSubtotal: c.minSubtotalCents ? (c.minSubtotalCents / 100).toFixed(2) : "", startsAt: toLocalInput(c.startsAt), endsAt: toLocalInput(c.endsAt),
    maxUses: c.maxUses ? String(c.maxUses) : "", maxUsesPerUser: c.maxUsesPerUser ? String(c.maxUsesPerUser) : "", isActive: c.isActive,
  });

  return (
    <>
      <PageHeader title="Cupones" subtitle="Descuentos validados siempre en el servidor." actions={<button className="btn-primario" onClick={() => setForm(empty)}><Plus className="size-4" /> Nuevo cupón</button>} />
      {form && (
        <form className="tarjeta mb-6 grid gap-4 p-5 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <Field label="Código" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} error={errors.code?.[0]} />
          <Select label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENT" })}>
            <option value="PERCENT">Porcentaje</option>
            <option value="FIXED">Importe fijo (MXN)</option>
          </Select>
          <Field label={form.type === "PERCENT" ? "Porcentaje (%)" : "Importe ($)"} inputMode="decimal" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} error={errors.value?.[0]} />
          <div className="sm:col-span-3"><Field label="Descripción interna" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <Field label="Compra mínima ($)" inputMode="decimal" value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} />
          <Field label="Inicio" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          <Field label="Vencimiento" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          <Field label="Usos máximos" inputMode="numeric" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
          <Field label="Usos por cliente" inputMode="numeric" value={form.maxUsesPerUser} onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })} />
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" className="size-5 accent-rosa-600" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Activo</label>
          {save.error && <div className="sm:col-span-3"><Alert kind="error">{(save.error as Error).message}</Alert></div>}
          <div className="flex gap-2 sm:col-span-3"><LoadingButton type="submit" loading={save.isPending}>Guardar</LoadingButton><button type="button" className="btn-fantasma" onClick={() => setForm(null)}>Cancelar</button></div>
        </form>
      )}
      {isLoading ? <Spinner /> : (
        <Table head={["Código", "Descuento", "Vigencia", "Usos", "Estado", ""]} empty={!data?.length}>
          {data?.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
              <td className="px-4 py-3">{c.type === "PERCENT" ? `${c.value}%` : money(c.value)}{c.minSubtotalCents ? <p className="text-xs text-cafe-400">Mínimo {money(c.minSubtotalCents)}</p> : null}</td>
              <td className="px-4 py-3 text-xs">{c.startsAt ? shortDate(c.startsAt) : "Inmediata"} – {c.endsAt ? shortDate(c.endsAt) : "Sin vencimiento"}</td>
              <td className="px-4 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
              <td className="px-4 py-3">{c.isActive ? "Activo" : <span className="text-cafe-400">Inactivo</span>}</td>
              <td className="px-4 py-3 text-right"><button className="btn-secundario btn-sm" onClick={() => edit(c)}>Editar</button></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
