/**
 * MODO VITRINA — API simulada en el navegador.
 *
 * Se activa al compilar con VITE_DEMO_MODE=true (pnpm --filter ./client build:demo).
 * Reproduce las respuestas del servidor real con datos de demostración incluidos en la página
 * y guarda carrito, cuentas, direcciones, favoritos y pedidos en el almacenamiento del navegador.
 * No hay base de datos, no se envían correos y no se procesan pagos.
 */
import { ApiError } from "../api";
import data from "./data.json";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const BASE = import.meta.env.BASE_URL; // "/" o "/Mafer-Bake/"
/** Las imágenes de demostración viven en /demo/: se ajustan a la ruta base del sitio. */
const asset = (url: string | null | undefined) => (url && url.startsWith("/") ? BASE + url.slice(1) : url ?? null);
const withAssets = <T extends Json>(p: T): T => ({ ...p, images: p.images?.map((i: Json) => ({ ...i, url: asset(i.url) })) });

export const DEMO_ADMIN = { email: "admin@demo.mafer", password: "demo1234" };

// ───────── Almacenamiento local seguro ─────────
const KEY = "mafer-demo-v1";
interface State {
  users: (Json & { password: string })[];
  sessionUserId: string | null;
  cart: Json[];
  addresses: Record<string, Json[]>;
  favorites: Record<string, string[]>;
  orders: Json[];
  orderSeq: number;
}
const fresh = (): State => ({ users: [], sessionUserId: null, cart: [], addresses: {}, favorites: {}, orders: [], orderSeq: 0 });
let memory: State | null = null;
function load(): State {
  if (memory) return memory;
  try {
    memory = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    memory = fresh();
  }
  return memory!;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* almacenamiento no disponible: se conserva solo en memoria */
  }
}
const uid = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

// ───────── Datos de demostración ─────────
const products = data.products.map((p) => withAssets(p as Json));
const bySlug = new Map(products.map((p) => [p.slug, p]));
const byId = new Map(products.map((p) => [p.id, p]));

const ADMIN_USER = { id: "demo-admin", email: DEMO_ADMIN.email, firstName: "Mafer", lastName: "Demo", phone: null, role: "ADMIN", emailVerified: true, createdAt: new Date().toISOString() };

function currentUser(): Json | null {
  const s = load();
  if (s.sessionUserId === ADMIN_USER.id) return ADMIN_USER;
  const u = s.users.find((x) => x.id === s.sessionUserId);
  if (!u) return null;
  const { password: _p, ...pub } = u;
  return pub;
}
function requireUser() {
  const u = currentUser();
  if (!u) throw new ApiError(401, "Debes iniciar sesión.", "UNAUTHORIZED");
  return u;
}
function requireAdmin() {
  const u = requireUser();
  if (u.role !== "ADMIN") throw new ApiError(403, "No tienes permiso para realizar esta acción.", "FORBIDDEN");
  return u;
}
const readOnly = () => {
  throw new ApiError(403, "Esta es una demostración del diseño: el panel es de solo lectura.", "DEMO");
};

// ───────── Precios (misma lógica que el servidor) ─────────
type Sel = Record<string, string | string[]>;
function resolveLine(p: Json, variantId: string | null, sel: Sel) {
  let unit = p.effectivePriceCents;
  let variantName: string | null = null;
  if (p.variants.length) {
    const v = p.variants.find((x: Json) => x.id === variantId);
    if (!v) throw new ApiError(400, `Selecciona una presentación válida para «${p.name}».`);
    unit += v.priceDeltaCents;
    variantName = v.name;
  }
  const customizations: Json[] = [];
  const normalized: Sel = {};
  for (const o of p.options) {
    const raw = sel[o.id];
    const empty = raw == null || (Array.isArray(raw) ? raw.length === 0 : !String(raw).trim());
    if (empty) {
      if (o.isRequired) throw new ApiError(400, `Elige «${o.name}».`);
      continue;
    }
    if (o.type === "TEXT") {
      const text = String(raw).trim();
      if (text.length > (o.maxLength ?? 120)) throw new ApiError(400, `«${o.name}» admite máximo ${o.maxLength} caracteres.`);
      customizations.push({ optionName: o.name, value: text, priceDeltaCents: 0 });
      normalized[o.id] = text;
      continue;
    }
    const ids = [...new Set(Array.isArray(raw) ? raw : [raw])];
    for (const id of ids) {
      const v = o.values.find((x: Json) => x.id === id);
      if (!v) throw new ApiError(400, `Una opción de «${o.name}» ya no está disponible.`);
      unit += v.priceDeltaCents;
      customizations.push({ optionName: o.name, value: v.label, priceDeltaCents: v.priceDeltaCents });
    }
    normalized[o.id] = o.type === "SINGLE" ? ids[0] : ids.sort();
  }
  return { unit, variantName, customizations, normalized };
}

function cartView() {
  const s = load();
  const items = s.cart.map((it) => {
    const p = byId.get(it.productId)!;
    const r = resolveLine(p, it.variantId, it.selections);
    return {
      id: it.id,
      productId: p.id,
      product: { id: p.id, name: p.name, slug: p.slug, image: p.images[0]?.url ?? null, inventoryMode: p.inventoryMode, prepTimeHours: p.prepTimeHours },
      variantId: it.variantId,
      variantName: r.variantName,
      customizations: r.customizations,
      quantity: it.quantity,
      maxQuantity: p.maxQuantity,
      unitPriceCents: r.unit,
      lineTotalCents: r.unit * it.quantity,
      issue: null,
    };
  });
  return {
    id: "demo",
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotalCents: items.reduce((n, i) => n + i.lineTotalCents, 0),
    hasIssues: false,
    items,
    maxPrep: items.reduce((m, i) => Math.max(m, i.product.prepTimeHours), 0),
  };
}
const publicCart = () => {
  const { maxPrep: _m, ...c } = cartView();
  return { cart: c };
};

function quote(body: Json) {
  const c = cartView();
  const st = data.store;
  const shipping = body.deliveryMethod === "DELIVERY" ? (st.deliveryFeeCents ?? 0) : 0;
  return {
    subtotalCents: c.subtotalCents,
    discountCents: 0,
    shippingCents: shipping,
    taxCents: 0,
    totalCents: c.subtotalCents + shipping,
    couponCode: null,
    couponError: body.couponCode ? "En la demostración no hay cupones activos." : null,
    pricesIncludeTax: true,
    leadHours: Math.max(st.minLeadHours, c.maxPrep),
    hasIssues: false,
    itemCount: c.itemCount,
  };
}

// ───────── Catálogo ─────────
function listProducts(q: URLSearchParams) {
  let items = products.slice();
  const text = q.get("q")?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (text) items = items.filter((p) => norm(p.name).includes(text) || norm(p.shortDescription).includes(text));
  if (q.get("category")) items = items.filter((p) => p.category.slug === q.get("category"));
  if (q.get("featured") === "true") items = items.filter((p) => p.isFeatured);
  if (q.get("onSale") === "true") items = items.filter((p) => p.salePriceCents != null);
  if (q.get("available") === "true") items = items.filter((p) => p.inStock);
  if (q.get("bestSellers") === "true") items = []; // sin ventas reales en la demostración
  const min = q.get("minPrice") ? Number(q.get("minPrice")) * 100 : null;
  const max = q.get("maxPrice") ? Number(q.get("maxPrice")) * 100 : null;
  if (min != null) items = items.filter((p) => p.effectivePriceCents >= min);
  if (max != null) items = items.filter((p) => p.effectivePriceCents <= max);
  const sort = q.get("sort") ?? "popular";
  const cmp: Record<string, (a: Json, b: Json) => number> = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    price_asc: (a, b) => a.effectivePriceCents - b.effectivePriceCents,
    price_desc: (a, b) => b.effectivePriceCents - a.effectivePriceCents,
    name: (a, b) => a.name.localeCompare(b.name, "es"),
    popular: (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.createdAt.localeCompare(a.createdAt),
  };
  items.sort(cmp[sort] ?? cmp.popular);
  const page = Math.max(1, Number(q.get("page") ?? 1));
  const pageSize = Math.min(48, Math.max(1, Number(q.get("pageSize") ?? 12)));
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) };
}

function availability(date: string) {
  const lead = Math.max(data.store.minLeadHours, cartView().maxPrep);
  const earliest = Date.now() + lead * 3_600_000;
  return {
    date,
    closedReason: null,
    leadHours: lead,
    slots: data.delivery.slots
      .filter((s: Json) => s.isActive)
      .map((s: Json) => {
        const ok = new Date(`${date}T${s.startTime}:00`).getTime() >= earliest;
        return { id: s.id, label: s.label, remaining: s.capacity, available: ok, reason: ok ? null : "Requiere más tiempo de anticipación." };
      }),
  };
}

// ───────── Pedidos de demostración ─────────
const orderNumber = (n: number) => `MF-${String(n).padStart(6, "0")}`;
function myOrders() {
  const u = requireUser();
  return load().orders.filter((o) => o.userId === u.id);
}
const strip = ({ userId: _u, ...o }: Json) => o;

// ───────── Enrutador ─────────
export async function demoHttp<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  await new Promise((r) => setTimeout(r, 120)); // simula la latencia de la red
  const method = (init.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://demo");
  const p = url.pathname;
  const q = url.searchParams;
  const body = (init.json ?? {}) as Json;
  const s = load();
  const m = (re: RegExp) => p.match(re);
  let r: RegExpMatchArray | null;

  // Tienda
  if (method === "GET" && p === "/store") return { settings: data.store } as T;
  if (method === "GET" && p === "/categories") return { items: data.categories } as T;
  if (method === "GET" && p === "/products") return listProducts(q) as T;
  if (method === "GET" && (r = m(/^\/products\/([^/]+)$/))) {
    const prod = bySlug.get(decodeURIComponent(r[1]));
    if (!prod) throw new ApiError(404, "Producto no encontrado.", "NOT_FOUND");
    return { product: prod } as T;
  }
  if (method === "GET" && p === "/availability") return availability(q.get("date") ?? "") as T;

  // Autenticación
  if (p === "/auth/me") return { user: currentUser() } as T;
  if (p === "/auth/login") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (email === DEMO_ADMIN.email && body.password === DEMO_ADMIN.password) {
      s.sessionUserId = ADMIN_USER.id;
      save();
      return { user: ADMIN_USER } as T;
    }
    const u = s.users.find((x) => x.email === email && x.password === body.password);
    if (!u) throw new ApiError(401, "Correo o contraseña incorrectos.", "UNAUTHORIZED");
    s.sessionUserId = u.id;
    save();
    return { user: currentUser() } as T;
  }
  if (p === "/auth/register") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (s.users.some((x) => x.email === email) || email === DEMO_ADMIN.email) throw new ApiError(409, "Ya existe una cuenta con ese correo.", "CONFLICT");
    const u = { id: uid(), email, firstName: body.firstName, lastName: body.lastName, phone: null, role: "CUSTOMER", emailVerified: true, createdAt: new Date().toISOString(), password: String(body.password) };
    s.users.push(u);
    s.sessionUserId = u.id;
    save();
    return { user: currentUser() } as T;
  }
  if (p === "/auth/logout") {
    s.sessionUserId = null;
    save();
    return { ok: true } as T;
  }
  if (p.startsWith("/auth/")) return { message: "En la demostración no se envían correos." } as T;

  // Cuenta
  if (p === "/account/profile") {
    const u = requireUser();
    if (u.role === "ADMIN") readOnly();
    Object.assign(s.users.find((x) => x.id === u.id)!, { firstName: body.firstName, lastName: body.lastName, phone: body.phone || null });
    save();
    return { user: currentUser() } as T;
  }
  if (p === "/account/password") return { message: "En la demostración la contraseña no se modifica." } as T;
  if (p.startsWith("/account/addresses")) {
    const u = requireUser();
    const list = (s.addresses[u.id] ??= []);
    const id = p.split("/")[3];
    if (method === "GET") return { items: list } as T;
    if (method === "DELETE") s.addresses[u.id] = list.filter((a) => a.id !== id);
    else {
      const isDefault = body.isDefault || list.length === 0;
      if (isDefault) list.forEach((a) => (a.isDefault = false));
      const a = { ...body, id: id ?? uid(), isDefault };
      s.addresses[u.id] = id ? list.map((x) => (x.id === id ? a : x)) : [...list, a];
      save();
      return { address: a } as T;
    }
    save();
    return { ok: true } as T;
  }
  if (p.startsWith("/account/favorites")) {
    const u = requireUser();
    const favs = (s.favorites[u.id] ??= []);
    const pid = p.split("/")[3];
    if (method === "PUT" && !favs.includes(pid)) favs.push(pid);
    if (method === "DELETE") s.favorites[u.id] = favs.filter((x) => x !== pid);
    save();
    if (method === "GET") {
      return { items: favs.map((id) => byId.get(id)).filter(Boolean).map((x) => ({ productId: x!.id, name: x!.name, slug: x!.slug, image: x!.images[0]?.url ?? null, priceCents: x!.effectivePriceCents })) } as T;
    }
    return { ok: true } as T;
  }

  // Carrito
  if (p === "/cart" && method === "GET") return publicCart() as T;
  if (p === "/cart/items" && method === "POST") {
    const prod = byId.get(body.productId);
    if (!prod) throw new ApiError(404, "Producto no encontrado.", "NOT_FOUND");
    const res = resolveLine(prod, body.variantId ?? null, body.selections ?? {});
    const key = JSON.stringify([prod.id, body.variantId ?? null, Object.entries(res.normalized).sort()]);
    const existing = s.cart.find((x) => x.key === key);
    const qty = (existing?.quantity ?? 0) + body.quantity;
    if (qty > prod.maxQuantity) throw new ApiError(400, `Solo hay ${prod.maxQuantity} piezas disponibles de «${prod.name}».`);
    if (existing) existing.quantity = qty;
    else s.cart.push({ id: uid(), key, productId: prod.id, variantId: body.variantId ?? null, selections: res.normalized, quantity: body.quantity });
    save();
    return publicCart() as T;
  }
  if ((r = m(/^\/cart\/items\/([^/]+)$/))) {
    const id = r[1];
    if (method === "DELETE") s.cart = s.cart.filter((x) => x.id !== id);
    else {
      const it = s.cart.find((x) => x.id === id);
      if (it) it.quantity = body.quantity;
    }
    save();
    return publicCart() as T;
  }

  // Pedidos (se guardan solo en este navegador)
  if (p === "/orders/quote") {
    requireUser();
    return { quote: quote(body) } as T;
  }
  if (p === "/orders" && method === "POST") {
    const u = requireUser();
    const c = cartView();
    if (!c.items.length) throw new ApiError(400, "Tu carrito está vacío.");
    const qt = quote(body);
    const slot = data.delivery.slots.find((x: Json) => x.id === body.slotId);
    const address = body.addressId ? (s.addresses[u.id] ?? []).find((a) => a.id === body.addressId) ?? null : null;
    const order = {
      id: uid(), userId: u.id, number: orderNumber(++s.orderSeq), status: "PENDING_PAYMENT", paymentStatus: "PENDING",
      deliveryMethod: body.deliveryMethod, address, requestedDate: body.requestedDate, requestedSlot: slot?.label ?? "",
      confirmedDate: null, ...qt, currency: "mxn", couponCode: null, customerNotes: body.notes || null,
      paidAt: null, cancelledAt: null, createdAt: new Date().toISOString(), payments: [],
      items: c.items.map((i) => ({ id: uid(), productId: i.productId, productName: i.product.name, variantName: i.variantName, imageUrl: i.product.image, unitPriceCents: i.unitPriceCents, quantity: i.quantity, lineTotalCents: i.lineTotalCents, customizations: i.customizations })),
    };
    s.orders.unshift(order);
    s.cart = [];
    save();
    return { order: strip(order) } as T;
  }
  if (p === "/orders" && method === "GET") return { items: myOrders().map(strip) } as T;
  if ((r = m(/^\/orders\/([^/]+)(\/cancel)?$/))) {
    const o = myOrders().find((x) => x.id === r![1]);
    if (!o) throw new ApiError(404, "Pedido no encontrado.", "NOT_FOUND");
    if (r[2]) {
      Object.assign(o, { status: "CANCELLED", paymentStatus: "CANCELLED", cancelledAt: new Date().toISOString() });
      save();
    }
    return { order: strip(o) } as T;
  }
  if (p.startsWith("/payments")) {
    throw new ApiError(503, "Esta es una demostración del diseño: no se procesan pagos. Tu pedido de prueba quedó guardado en «Mis pedidos».", "DEMO");
  }

  // Panel administrativo (solo lectura)
  if (p.startsWith("/admin")) {
    requireAdmin();
    if (method !== "GET") readOnly();
    const sub = p.slice("/admin".length);
    const page = (items: Json[]) => ({ items, total: items.length, page: 1, pageSize: items.length || 20, totalPages: 1 });
    const allOrders = s.orders;
    if (sub === "/dashboard") {
      const today = new Date();
      const series = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(today.getTime() - (13 - i) * 86_400_000);
        return { date: d.toISOString().slice(0, 10), cents: 0 };
      });
      return {
        salesTodayCents: 0, ordersPaidToday: 0, salesMonthCents: 0, ordersPaidMonth: 0, collectedMonthCents: 0, refundedMonthCents: 0,
        newOrdersToday: allOrders.length, pendingPayment: allOrders.filter((o) => o.status === "PENDING_PAYMENT").length,
        inPreparation: 0, readyForDelivery: 0,
        lowStock: data.inventory.filter((i: Json) => i.inventoryMode === "TRACKED" && i.stock <= i.lowStockThreshold),
        topProducts: [], salesSeries: series,
        recentOrders: allOrders.slice(0, 8).map((o) => ({ id: o.id, number: o.number, customer: customerName(o.userId), totalCents: o.totalCents, status: o.status, paymentStatus: o.paymentStatus, createdAt: o.createdAt })),
      } as T;
    }
    if (sub === "/categories") return { items: data.adminCategories } as T;
    if (sub === "/products") {
      const text = q.get("q")?.toLowerCase();
      const status = q.get("status");
      const items = data.adminProducts
        .filter((x: Json) => (!text || x.name.toLowerCase().includes(text)) && (!status || x.status === status))
        .map((x: Json) => ({ ...withAssets(x), images: withAssets(x).images.slice(0, 1) }));
      return page(items) as T;
    }
    if ((r = sub.match(/^\/products\/([^/]+)$/))) {
      const x = data.adminProducts.find((y: Json) => y.id === r![1]);
      if (!x) throw new ApiError(404, "Producto no encontrado.", "NOT_FOUND");
      return { product: withAssets(x) } as T;
    }
    if (sub === "/inventory") return { items: data.inventory } as T;
    if (sub === "/inventory/movements") return { items: [] } as T;
    if (sub === "/orders") {
      return page(allOrders.map((o) => ({ id: o.id, number: o.number, customer: { name: customerName(o.userId), email: customerEmail(o.userId) }, itemCount: o.items.length, totalCents: o.totalCents, status: o.status, paymentStatus: o.paymentStatus, deliveryMethod: o.deliveryMethod, requestedDate: o.requestedDate, requestedSlot: o.requestedSlot, createdAt: o.createdAt }))) as T;
    }
    if ((r = sub.match(/^\/orders\/([^/]+)$/))) {
      const o = allOrders.find((x) => x.id === r![1]);
      if (!o) throw new ApiError(404, "Pedido no encontrado.", "NOT_FOUND");
      const u = s.users.find((x) => x.id === o.userId);
      return { order: { ...strip(o), adminNotes: null, customer: { id: o.userId, firstName: u?.firstName ?? "", lastName: u?.lastName ?? "", email: u?.email ?? "", phone: null }, history: [] } } as T;
    }
    if (sub === "/customers") return page(s.users.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: null, isActive: true, emailVerifiedAt: u.createdAt, createdAt: u.createdAt, _count: { orders: allOrders.filter((o) => o.userId === u.id).length } }))) as T;
    if ((r = sub.match(/^\/customers\/([^/]+)$/))) {
      const u = s.users.find((x) => x.id === r![1]);
      if (!u) throw new ApiError(404, "Cliente no encontrado.", "NOT_FOUND");
      const { password: _p, ...pub } = u;
      return { customer: { ...pub, isActive: true, emailVerifiedAt: u.createdAt, addresses: s.addresses[u.id] ?? [], orders: allOrders.filter((o) => o.userId === u.id) } } as T;
    }
    if (sub === "/payments") return page([]) as T;
    if (sub === "/coupons") return { items: [] } as T;
    if (sub === "/settings") return { settings: data.settings } as T;
    if (sub === "/delivery") return data.delivery as T;
    if (sub === "/audit") return { items: [] } as T;
  }

  throw new ApiError(404, "Ruta no encontrada.", "NOT_FOUND");

  function customerName(id: string) {
    const u = s.users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : "Cliente";
  }
  function customerEmail(id: string) {
    return s.users.find((x) => x.id === id)?.email ?? "";
  }
}
