import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState, OrderStatusBadge, PaymentStatusBadge, Spinner } from "../../components/ui";
import { PageHeader, Table } from "../../layouts/AdminLayout";
import { money, shortDateTime } from "../../lib/format";
import { adminApi } from "../../services/api";
import type { OrderStatus, PaymentStatus } from "../../types";

interface Dashboard {
  salesTodayCents: number; ordersPaidToday: number; salesMonthCents: number; ordersPaidMonth: number;
  collectedMonthCents: number; refundedMonthCents: number; newOrdersToday: number; pendingPayment: number;
  inPreparation: number; readyForDelivery: number;
  lowStock: { id: string; name: string; stock: number; lowStockThreshold: number }[];
  topProducts: { productId: string | null; name: string; quantity: number; revenueCents: number }[];
  salesSeries: { date: string; cents: number }[];
  recentOrders: { id: string; number: string; customer: string; totalCents: number; status: OrderStatus; paymentStatus: PaymentStatus; createdAt: string }[];
}

function Stat({ label, value, hint, to }: { label: string; value: string | number; hint?: string; to?: string }) {
  const body = (
    <>
      <p className="text-xs font-bold tracking-wide text-cafe-500 uppercase">{label}</p>
      <p className="mt-2 font-display text-3xl text-cafe-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-cafe-400">{hint}</p>}
    </>
  );
  return to ? <Link to={to} className="tarjeta block p-5 transition hover:bg-rosa-50">{body}</Link> : <div className="tarjeta p-5">{body}</div>;
}

const dayLabel = (d: string) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

/** Barras de una sola serie (ventas cobradas por día), con tooltip por barra y tabla accesible. */
function SalesChart({ series }: { series: Dashboard["salesSeries"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...series.map((s) => s.cents), 1);
  const total = series.reduce((s, x) => s + x.cents, 0);
  return (
    <figure className="tarjeta p-5">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-lg text-cafe-900">Ventas cobradas · últimos 14 días</span>
        <span className="text-sm text-cafe-500">Total {money(total)}</span>
      </figcaption>
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-cafe-500">Aún no hay ventas cobradas en este periodo.</p>
      ) : (
        <div className="relative">
          <div className="flex h-44 items-end gap-[2px] border-b border-crema-300" aria-hidden="true">
            {series.map((s, i) => (
              <div key={s.date} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <div className={`w-full rounded-t-[4px] transition-colors ${hover === i ? "bg-rosa-700" : "bg-rosa-600"}`} style={{ height: `${s.cents ? Math.max(2, (s.cents / max) * 100) : 0}%` }} />
              </div>
            ))}
          </div>
          {hover !== null && (
            <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-cafe-900 px-3 py-1.5 text-xs whitespace-nowrap text-crema-50 shadow-lg" style={{ left: `${((hover + 0.5) / series.length) * 100}%` }}>
              {dayLabel(series[hover].date)} · <strong>{money(series[hover].cents)}</strong>
            </div>
          )}
          <div className="mt-2 flex justify-between text-[11px] text-cafe-400" aria-hidden="true">
            <span>{dayLabel(series[0].date)}</span>
            <span>{dayLabel(series[series.length - 1].date)}</span>
          </div>
        </div>
      )}
      <details className="mt-3 text-xs text-cafe-500">
        <summary className="cursor-pointer font-semibold">Ver como tabla</summary>
        <table className="mt-2 w-full">
          <tbody>{series.map((s) => <tr key={s.date}><td className="py-0.5">{dayLabel(s.date)}</td><td className="text-right">{money(s.cents)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

export default function AdminDashboard() {
  const { data: d, isLoading, isError, refetch } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => adminApi.get<Dashboard>("/dashboard"), refetchInterval: 60_000 });
  if (isLoading) return <Spinner />;
  if (isError || !d) return <ErrorState message="No pudimos cargar el dashboard." onRetry={refetch} />;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Indicadores calculados con los pedidos y pagos registrados." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Ventas de hoy" value={money(d.salesTodayCents)} hint={`${d.ordersPaidToday} pedido(s) pagado(s)`} />
        <Stat label="Ventas del mes" value={money(d.salesMonthCents)} hint={`${d.ordersPaidMonth} pedido(s) pagado(s)`} />
        <Stat label="Ingresos cobrados (mes)" value={money(d.collectedMonthCents - d.refundedMonthCents)} hint={`Cobrado ${money(d.collectedMonthCents)} · Reembolsado ${money(d.refundedMonthCents)}`} />
        <Stat label="Pedidos nuevos hoy" value={d.newOrdersToday} to="/admin/pedidos" />
        <Stat label="Pendientes de pago" value={d.pendingPayment} hint="Aún no cuentan como ingreso" to="/admin/pedidos?estado=PENDING_PAYMENT" />
        <Stat label="Por preparar" value={d.inPreparation} hint="Confirmados y en preparación" to="/admin/pedidos?estado=IN_PREPARATION" />
        <Stat label="Listos para entregar" value={d.readyForDelivery} to="/admin/pedidos?estado=READY" />
        <Stat label="Inventario bajo" value={d.lowStock.length} to="/admin/inventario" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SalesChart series={d.salesSeries} />
        <div className="tarjeta p-5">
          <h2 className="mb-3 text-lg">Más vendidos del mes</h2>
          {d.topProducts.length ? (
            <ol className="space-y-2 text-sm">
              {d.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-rosa-100 text-xs font-bold text-rosa-700">{i + 1}</span>
                  <span className="flex-1">{p.name}</span>
                  <span className="text-cafe-500">{p.quantity} pzs</span>
                  <span className="font-semibold">{money(p.revenueCents)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-cafe-500">Sin ventas cobradas este mes.</p>}
          {d.lowStock.length > 0 && (
            <>
              <h2 className="mt-6 mb-3 flex items-center gap-2 text-lg"><AlertTriangle className="size-4 text-aviso" /> Inventario bajo</h2>
              <ul className="space-y-1.5 text-sm">
                {d.lowStock.map((p) => <li key={p.id} className="flex justify-between"><span>{p.name}</span><span className="font-bold text-aviso">{p.stock} / mín. {p.lowStockThreshold}</span></li>)}
              </ul>
            </>
          )}
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-xl">Últimos pedidos</h2>
      <Table head={["Pedido", "Cliente", "Fecha", "Estado", "Pago", "Total"]} empty={!d.recentOrders.length}>
        {d.recentOrders.map((o) => (
          <tr key={o.id} className="hover:bg-crema-50">
            <td className="px-4 py-3 font-bold"><Link className="text-rosa-600 hover:underline" to={`/admin/pedidos/${o.id}`}>{o.number}</Link></td>
            <td className="px-4 py-3">{o.customer}</td>
            <td className="px-4 py-3 text-cafe-500">{shortDateTime(o.createdAt)}</td>
            <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
            <td className="px-4 py-3"><PaymentStatusBadge status={o.paymentStatus} /></td>
            <td className="px-4 py-3 font-semibold">{money(o.totalCents)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
