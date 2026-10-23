import type {
  Address, Cart, Category, Order, Paginated, Product, Quote, Selections, SlotAvailability, StoreSettings, User,
} from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public details?: unknown) {
    super(message);
  }
  /** Errores de validación por campo: { campo: ["mensaje"] } */
  get fieldErrors(): Record<string, string[]> {
    return this.code === "VALIDATION" && this.details && typeof this.details === "object" ? (this.details as Record<string, string[]>) : {};
  }
}

export async function http<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: "include",
      ...rest,
      headers: { ...(json !== undefined && { "Content-Type": "application/json" }), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.", "NETWORK");
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new ApiError(res.status, e.message ?? "Ocurrió un error inesperado.", e.code, e.details);
  }
  return data as T;
}

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : "";
};

export const api = {
  // Tienda
  store: () => http<{ settings: StoreSettings }>("/store").then((r) => r.settings),
  categories: () => http<{ items: Category[] }>("/categories").then((r) => r.items),
  products: (p: Record<string, string | number | undefined>) => http<Paginated<Product>>(`/products${qs(p)}`),
  product: (slug: string) => http<{ product: Product }>(`/products/${encodeURIComponent(slug)}`).then((r) => r.product),
  availability: (date: string) => http<SlotAvailability>(`/availability${qs({ date })}`),

  // Autenticación
  me: () => http<{ user: User | null }>("/auth/me").then((r) => r.user),
  login: (body: { email: string; password: string }) => http<{ user: User }>("/auth/login", { method: "POST", json: body }).then((r) => r.user),
  register: (body: Record<string, unknown>) => http<{ user: User }>("/auth/register", { method: "POST", json: body }).then((r) => r.user),
  logout: () => http("/auth/logout", { method: "POST" }),
  forgot: (email: string) => http<{ message: string }>("/auth/forgot-password", { method: "POST", json: { email } }),
  reset: (body: { token: string; password: string; confirmPassword: string }) => http<{ message: string }>("/auth/reset-password", { method: "POST", json: body }),
  verifyEmail: (token: string) => http<{ message: string }>("/auth/verify-email", { method: "POST", json: { token } }),
  resendVerification: () => http<{ message: string }>("/auth/resend-verification", { method: "POST" }),

  // Cuenta
  updateProfile: (body: { firstName: string; lastName: string; phone?: string | null }) =>
    http<{ user: User }>("/account/profile", { method: "PATCH", json: body }).then((r) => r.user),
  changePassword: (body: { currentPassword: string; newPassword: string }) => http<{ message: string }>("/account/password", { method: "POST", json: body }),
  addresses: () => http<{ items: Address[] }>("/account/addresses").then((r) => r.items),
  saveAddress: (body: Partial<Address>, id?: string) =>
    http<{ address: Address }>(id ? `/account/addresses/${id}` : "/account/addresses", { method: id ? "PUT" : "POST", json: body }).then((r) => r.address),
  deleteAddress: (id: string) => http(`/account/addresses/${id}`, { method: "DELETE" }),
  favorites: () => http<{ items: { productId: string; name: string; slug: string; image: string | null; priceCents: number }[] }>("/account/favorites").then((r) => r.items),
  addFavorite: (productId: string) => http(`/account/favorites/${productId}`, { method: "PUT" }),
  removeFavorite: (productId: string) => http(`/account/favorites/${productId}`, { method: "DELETE" }),

  // Carrito
  cart: () => http<{ cart: Cart }>("/cart").then((r) => r.cart),
  addToCart: (body: { productId: string; variantId?: string | null; quantity: number; selections: Selections }) =>
    http<{ cart: Cart }>("/cart/items", { method: "POST", json: body }).then((r) => r.cart),
  updateCartItem: (id: string, quantity: number) => http<{ cart: Cart }>(`/cart/items/${id}`, { method: "PATCH", json: { quantity } }).then((r) => r.cart),
  removeCartItem: (id: string) => http<{ cart: Cart }>(`/cart/items/${id}`, { method: "DELETE" }).then((r) => r.cart),

  // Pedidos y pagos
  quote: (body: Record<string, unknown>) => http<{ quote: Quote }>("/orders/quote", { method: "POST", json: body }).then((r) => r.quote),
  createOrder: (body: Record<string, unknown>) => http<{ order: Order }>("/orders", { method: "POST", json: body }).then((r) => r.order),
  orders: () => http<{ items: Order[] }>("/orders").then((r) => r.items),
  order: (id: string) => http<{ order: Order }>(`/orders/${id}`).then((r) => r.order),
  cancelOrder: (id: string) => http<{ order: Order }>(`/orders/${id}/cancel`, { method: "POST" }).then((r) => r.order),
  checkout: (orderId: string) => http<{ url: string }>("/payments/checkout-session", { method: "POST", json: { orderId } }),
  syncPayment: (orderId: string) => http<{ order: Pick<Order, "id" | "status" | "paymentStatus"> }>(`/payments/sync/${orderId}`, { method: "POST" }),
};

/** Llamadas genéricas para el panel administrativo. */
export const adminApi = {
  get: <T>(path: string, params: Record<string, string | number | undefined> = {}) => http<T>(`/admin${path}${qs(params)}`),
  send: <T>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, json?: unknown) => http<T>(`/admin${path}`, { method, json }),
  async upload(file: File) {
    const form = new FormData();
    form.append("image", file);
    return http<{ url: string }>("/admin/uploads", { method: "POST", body: form });
  },
};
