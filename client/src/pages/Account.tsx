import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, LogOut, MailWarning, MapPin, Package, Pencil, Trash2, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AddressForm, addressLine } from "../components/AddressForm";
import { Alert, ConfirmDialog, EmptyState, ErrorState, Field, LoadingButton, OrderStatusBadge, PaymentStatusBadge, ProductImage, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../hooks/useShop";
import { longDate, money, shortDate, shortDateTime } from "../lib/format";
import { api, ApiError } from "../services/api";
import type { Address } from "../types";

const LINKS = [
  { to: "/cuenta", label: "Resumen", Icon: UserRound, end: true },
  { to: "/cuenta/pedidos", label: "Mis pedidos", Icon: Package },
  { to: "/cuenta/direcciones", label: "Direcciones", Icon: MapPin },
  { to: "/cuenta/favoritos", label: "Favoritos", Icon: Heart },
  { to: "/cuenta/datos", label: "Datos personales", Icon: Pencil },
];

export function AccountLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="contenedor pt-10">
      <p className="sobretitulo">Mi cuenta</p>
      <h1 className="mt-1 mb-8 text-4xl">Hola, {user?.firstName}</h1>
      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        <nav aria-label="Mi cuenta" className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {LINKS.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${isActive ? "bg-white text-rosa-600 shadow-[var(--shadow-suave)]" : "hover:bg-crema-200"}`}>
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
          <button onClick={async () => { await logout(); navigate("/"); }} className="flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-cafe-500 hover:bg-crema-200">
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}

function VerifyBanner() {
  const { user } = useAuth();
  const notify = useToast();
  const m = useMutation({ mutationFn: api.resendVerification, onSuccess: (r) => notify(r.message), onError: (e) => notify(errorMessage(e), "error") });
  if (!user || user.emailVerified) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-[#fbf0dc] px-4 py-3 text-sm text-aviso">
      <MailWarning className="size-5" />
      <p className="flex-1 font-semibold">Confirma tu correo electrónico para mantener tu cuenta segura.</p>
      <LoadingButton loading={m.isPending} className="btn-secundario btn-sm" onClick={() => m.mutate()}>Reenviar enlace</LoadingButton>
    </div>
  );
}

export function AccountOverview() {
  const [params] = useSearchParams();
  const { data: orders, isLoading } = useQuery({ queryKey: ["orders"], queryFn: api.orders });
  const recent = orders?.slice(0, 3) ?? [];
  return (
    <div>
      {params.get("bienvenida") && <div className="mb-6"><Alert kind="exito">¡Bienvenida a Mafer! Tu cuenta está lista.</Alert></div>}
      <VerifyBanner />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="tarjeta p-5"><p className="text-sm text-cafe-500">Pedidos</p><p className="mt-1 font-display text-3xl">{orders?.length ?? "—"}</p></div>
        <div className="tarjeta p-5"><p className="text-sm text-cafe-500">En proceso</p><p className="mt-1 font-display text-3xl">{orders?.filter((o) => ["CONFIRMED", "IN_PREPARATION", "READY", "OUT_FOR_DELIVERY"].includes(o.status)).length ?? "—"}</p></div>
        <div className="tarjeta p-5"><p className="text-sm text-cafe-500">Pendientes de pago</p><p className="mt-1 font-display text-3xl">{orders?.filter((o) => o.status === "PENDING_PAYMENT").length ?? "—"}</p></div>
      </div>
      <h2 className="mt-10 mb-4 text-2xl">Pedidos recientes</h2>
      {isLoading ? <Spinner /> : recent.length ? <OrderList orders={recent} /> : (
        <EmptyState title="Aún no tienes pedidos"><Link to="/catalogo" className="btn-primario mt-2">Explorar catálogo</Link></EmptyState>
      )}
    </div>
  );
}

function OrderList({ orders }: { orders: NonNullable<ReturnType<typeof useOrders>["data"]> }) {
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link to={`/cuenta/pedidos/${o.id}`} className="tarjeta flex flex-wrap items-center gap-4 p-4 transition hover:bg-rosa-50">
            <div className="flex -space-x-3">
              {o.items?.slice(0, 3).map((i) => <ProductImage key={i.id} src={i.imageUrl} alt="" className="size-12 rounded-full border-2 border-white" />)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{o.number}</p>
              <p className="text-xs text-cafe-500">{shortDate(o.createdAt)} · Para el {longDate(o.requestedDate)}</p>
            </div>
            <div className="flex flex-wrap gap-1.5"><OrderStatusBadge status={o.status} /><PaymentStatusBadge status={o.paymentStatus} /></div>
            <p className="font-bold">{money(o.totalCents)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
const useOrders = () => useQuery({ queryKey: ["orders"], queryFn: api.orders });

export function AccountOrders() {
  const { data, isLoading, isError, refetch } = useOrders();
  return (
    <div>
      <h2 className="mb-4 text-2xl">Historial de pedidos</h2>
      {isLoading ? <Spinner /> : isError ? <ErrorState message="No pudimos cargar tus pedidos." onRetry={refetch} /> : data?.length ? <OrderList orders={data} /> : (
        <EmptyState title="Aún no tienes pedidos" icon={<Package className="size-10" />}><Link to="/catalogo" className="btn-primario mt-2">Explorar catálogo</Link></EmptyState>
      )}
    </div>
  );
}

const STEPS = ["CONFIRMED", "IN_PREPARATION", "READY", "DELIVERED"] as const;
const STEP_LABEL = { CONFIRMED: "Confirmado", IN_PREPARATION: "En preparación", READY: "Listo", DELIVERED: "Entregado" };

export function AccountOrderDetail() {
  const { id = "" } = useParams();
  const notify = useToast();
  const qc = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [paying, setPaying] = useState(false);
  const { data: o, isLoading, isError, error } = useQuery({ queryKey: ["order", id], queryFn: () => api.order(id) });
  const cancel = useMutation({
    mutationFn: () => api.cancelOrder(id),
    onSuccess: (order) => {
      qc.setQueryData(["order", id], order);
      qc.invalidateQueries({ queryKey: ["orders"] });
      setConfirmCancel(false);
      notify("Pedido cancelado.");
    },
    onError: (e) => notify(errorMessage(e), "error"),
  });
  const pay = async () => {
    setPaying(true);
    try {
      window.location.assign((await api.checkout(id)).url);
    } catch (e) {
      notify(errorMessage(e), "error");
      setPaying(false);
    }
  };

  if (isLoading) return <Spinner />;
  if (isError || !o) return <ErrorState message={error instanceof ApiError && error.status === 404 ? "No encontramos este pedido." : "No pudimos cargar el pedido."} />;

  const progressIndex = o.status === "OUT_FOR_DELIVERY" ? 2.5 : STEPS.indexOf(o.status as (typeof STEPS)[number]);
  return (
    <div className="space-y-5">
      <Link to="/cuenta/pedidos" className="text-sm font-semibold text-rosa-600 hover:underline">← Todos mis pedidos</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl">Pedido {o.number}</h2>
          <p className="text-sm text-cafe-500">Realizado el {shortDateTime(o.createdAt)}</p>
        </div>
        <div className="flex gap-1.5"><OrderStatusBadge status={o.status} /><PaymentStatusBadge status={o.paymentStatus} /></div>
      </div>

      {o.status === "PENDING_PAYMENT" && (
        <div className="tarjeta flex flex-wrap items-center gap-3 border-l-4 border-aviso p-5">
          <p className="flex-1 text-sm">Tu pedido está apartado y <strong>pendiente de pago</strong>. Si no se paga a tiempo, se cancelará automáticamente.</p>
          <LoadingButton loading={paying} onClick={pay}>Pagar ahora</LoadingButton>
          <button className="btn-fantasma" onClick={() => setConfirmCancel(true)}>Cancelar pedido</button>
        </div>
      )}

      {o.status !== "CANCELLED" && o.status !== "PENDING_PAYMENT" && (
        <ol className="tarjeta grid grid-cols-4 gap-2 p-5 text-center text-xs" aria-label="Progreso del pedido">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-col items-center gap-2">
              <span className={`size-3 rounded-full ${i <= progressIndex ? "bg-rosa-600" : "bg-crema-300"}`} />
              <span className={i <= progressIndex ? "font-bold text-cafe-900" : "text-cafe-400"}>{STEP_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="tarjeta p-5 text-sm">
          <h3 className="mb-2 text-lg">Entrega</h3>
          <p><strong>{o.deliveryMethod === "PICKUP" ? "Recoger en tienda" : "Entrega a domicilio"}</strong></p>
          <p className="mt-1">Fecha solicitada: {longDate(o.requestedDate)}, {o.requestedSlot}</p>
          {o.confirmedDate && <p className="mt-1 font-semibold text-exito">Fecha confirmada: {longDate(o.confirmedDate)}</p>}
          {o.address && <p className="mt-2 text-cafe-500">{o.address.recipient} · {addressLine(o.address)}</p>}
        </div>
        <div className="tarjeta p-5 text-sm">
          <h3 className="mb-2 text-lg">Pago</h3>
          <dl className="space-y-1.5">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.subtotalCents)}</dd></div>
            {o.discountCents > 0 && <div className="flex justify-between text-exito"><dt>Descuento {o.couponCode && `(${o.couponCode})`}</dt><dd>−{money(o.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt>Envío</dt><dd>{money(o.shippingCents)}</dd></div>
            {o.taxCents > 0 && <div className="flex justify-between"><dt>Impuestos</dt><dd>{money(o.taxCents)}</dd></div>}
            <div className="flex justify-between border-t border-crema-200 pt-2 text-base font-bold"><dt>Total</dt><dd>{money(o.totalCents)}</dd></div>
          </dl>
          {o.payments?.some((p) => p.refundedCents > 0) && <p className="mt-2 text-xs text-cafe-500">Reembolsado: {money(o.payments.reduce((s, p) => s + p.refundedCents, 0))}</p>}
        </div>
      </div>

      <div className="tarjeta p-5">
        <h3 className="mb-4 text-lg">Productos</h3>
        <ul className="divide-y divide-crema-200">
          {o.items?.map((i) => (
            <li key={i.id} className="flex gap-4 py-3">
              <ProductImage src={i.imageUrl} alt="" className="size-16 shrink-0 rounded-xl" />
              <div className="flex-1 text-sm">
                <p className="font-bold">{i.productName} <span className="font-normal text-cafe-400">× {i.quantity}</span></p>
                {i.variantName && <p className="text-cafe-500">{i.variantName}</p>}
                {i.customizations.map((c, k) => <p key={k} className="text-xs text-cafe-500"><span className="font-semibold">{c.optionName}:</span> {c.value}</p>)}
              </div>
              <p className="text-sm font-bold">{money(i.lineTotalCents)}</p>
            </li>
          ))}
        </ul>
        {o.customerNotes && <p className="mt-3 rounded-xl bg-crema-100 p-3 text-sm"><strong>Tus notas:</strong> {o.customerNotes}</p>}
      </div>
      <p className="text-sm text-cafe-500">¿Necesitas ayuda con este pedido? <Link to="/ayuda#contacto" className="font-bold text-rosa-600 hover:underline">Contáctanos</Link> e indica el número {o.number}.</p>

      <ConfirmDialog open={confirmCancel} title="¿Cancelar este pedido?" confirmLabel="Sí, cancelar" danger loading={cancel.isPending} onConfirm={() => cancel.mutate()} onClose={() => setConfirmCancel(false)}>
        Se liberarán los productos apartados. Esta acción no se puede deshacer.
      </ConfirmDialog>
    </div>
  );
}

export function AccountAddresses() {
  const qc = useQueryClient();
  const notify = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["addresses"], queryFn: api.addresses });
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Address | null>(null);
  const del = useMutation({
    mutationFn: (id: string) => api.deleteAddress(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); setToDelete(null); notify("Dirección eliminada."); },
    onError: (e) => notify(errorMessage(e), "error"),
  });
  const saved = () => { qc.invalidateQueries({ queryKey: ["addresses"] }); setEditing(null); notify("Dirección guardada."); };

  if (isLoading) return <Spinner />;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl">Mis direcciones</h2>
        {!editing && <button className="btn-primario btn-sm" onClick={() => setEditing("new")}>Agregar dirección</button>}
      </div>
      {editing ? (
        <div className="tarjeta p-5"><AddressForm initial={editing === "new" ? undefined : editing} onSaved={saved} onCancel={() => setEditing(null)} /></div>
      ) : data?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((a) => (
            <li key={a.id} className="tarjeta p-5 text-sm">
              <p className="font-bold">{a.label} {a.isDefault && <span className="ml-1 rounded-full bg-rosa-100 px-2 py-0.5 text-xs text-rosa-700">Predeterminada</span>}</p>
              <p className="mt-1">{a.recipient} · {a.phone}</p>
              <p className="mt-1 text-cafe-500">{addressLine(a)}</p>
              <div className="mt-3 flex gap-2">
                <button className="btn-secundario btn-sm" onClick={() => setEditing(a)}><Pencil className="size-3.5" /> Editar</button>
                <button className="btn-fantasma btn-sm text-error" onClick={() => setToDelete(a)}><Trash2 className="size-3.5" /> Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Sin direcciones guardadas" icon={<MapPin className="size-10" />}>Agrega una dirección para tus entregas a domicilio.</EmptyState>
      )}
      <ConfirmDialog open={!!toDelete} title="¿Eliminar esta dirección?" danger confirmLabel="Eliminar" loading={del.isPending} onConfirm={() => toDelete && del.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </div>
  );
}

export function AccountFavorites() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["favorites"], queryFn: api.favorites });
  const remove = useMutation({ mutationFn: api.removeFavorite, onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }) });
  if (isLoading) return <Spinner />;
  return (
    <div>
      <h2 className="mb-4 text-2xl">Mis favoritos</h2>
      {data?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((f) => (
            <li key={f.productId} className="tarjeta overflow-hidden">
              <Link to={`/producto/${f.slug}`}><ProductImage src={f.image} alt={f.name} className="aspect-[4/3] w-full" /></Link>
              <div className="flex items-center justify-between gap-2 p-4">
                <div><Link to={`/producto/${f.slug}`} className="font-display text-lg hover:text-rosa-600">{f.name}</Link><p className="text-sm font-bold">{money(f.priceCents)}</p></div>
                <button className="grid size-10 place-items-center rounded-full hover:bg-rosa-50" onClick={() => remove.mutate(f.productId)} aria-label={`Quitar ${f.name} de favoritos`}>
                  <Heart className="size-5 fill-rosa-600 text-rosa-600" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Aún no guardas favoritos" icon={<Heart className="size-10" />}>Toca el corazón en cualquier producto para guardarlo aquí.</EmptyState>
      )}
    </div>
  );
}

export function AccountProfile() {
  const { user, setUser } = useAuth();
  const notify = useToast();
  const [f, setF] = useState({ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", phone: user?.phone ?? "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const profile = useMutation({ mutationFn: () => api.updateProfile(f), onSuccess: (u) => { setUser(u); notify("Datos actualizados."); } });
  const password = useMutation({ mutationFn: () => api.changePassword(pw), onSuccess: (r) => { notify(r.message); setPw({ currentPassword: "", newPassword: "" }); } });
  const fe = profile.error instanceof ApiError ? profile.error.fieldErrors : {};
  const pe = password.error instanceof ApiError ? password.error.fieldErrors : {};

  return (
    <div className="space-y-6">
      <form className="tarjeta space-y-4 p-5 sm:p-6" onSubmit={(e: FormEvent) => { e.preventDefault(); profile.mutate(); }}>
        <h2 className="text-2xl">Datos personales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} error={fe.firstName?.[0]} />
          <Field label="Apellidos" required value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} error={fe.lastName?.[0]} />
          <Field label="Teléfono" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <Field label="Correo electrónico" value={user?.email ?? ""} disabled hint={user?.emailVerified ? "Verificado" : "Pendiente de verificar"} />
        </div>
        {profile.error && <Alert kind="error">{(profile.error as Error).message}</Alert>}
        <LoadingButton loading={profile.isPending} type="submit">Guardar cambios</LoadingButton>
      </form>
      <form className="tarjeta space-y-4 p-5 sm:p-6" onSubmit={(e: FormEvent) => { e.preventDefault(); password.mutate(); }}>
        <h2 className="text-2xl">Cambiar contraseña</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contraseña actual" type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          <Field label="Nueva contraseña" type="password" autoComplete="new-password" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={pe.newPassword?.[0]} hint="Mínimo 8 caracteres, con letras y números." />
        </div>
        {password.error && <Alert kind="error">{(password.error as Error).message}</Alert>}
        <LoadingButton loading={password.isPending} type="submit" className="btn-cafe">Actualizar contraseña</LoadingButton>
        <p className="text-xs text-cafe-400">Al cambiarla se cerrarán tus sesiones en otros dispositivos.</p>
      </form>
    </div>
  );
}
