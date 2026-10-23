# API de Mafer — `/api/v1`

- Formato JSON. Importes en **centavos** (MXN).
- Autenticación por cookie de sesión `mafer_sid` (HttpOnly). El frontend envía `credentials: "include"`.
- Peticiones que modifican datos deben venir de un origen permitido (`CLIENT_URL` / `CORS_ORIGINS`).
- Errores: `{ "error": { "code", "message", "details?" } }`. Validación → `400 VALIDATION` con `details` por campo.

Leyenda de acceso: **Público**, **Cliente** (sesión iniciada), **Admin** (rol ADMIN verificado en servidor).

## Autenticación

| Método | Ruta | Acceso | Notas |
|---|---|---|---|
| POST | `/auth/register` | Público | `firstName, lastName, email, password, confirmPassword, acceptTerms:true`. Siempre crea `CUSTOMER`; campos extra (como `role`) → 400. Inicia sesión y envía verificación. |
| POST | `/auth/login` | Público | Mensaje genérico ante error. Bloqueo de 15 min tras 5 intentos fallidos. Rate limit. |
| POST | `/auth/logout` | Público | Elimina la sesión del servidor. |
| GET | `/auth/me` | Público | `{ user }` o `{ user: null }`. |
| POST | `/auth/forgot-password` | Público | Siempre responde igual (no revela cuentas). Token de 1 h, un solo uso. |
| POST | `/auth/reset-password` | Público | `token, password, confirmPassword`. Cierra todas las sesiones. |
| POST | `/auth/verify-email` | Público | `token` (24 h, un solo uso). |
| POST | `/auth/resend-verification` | Cliente | |

## Cuenta

| Método | Ruta | Acceso |
|---|---|---|
| PATCH | `/account/profile` | Cliente |
| POST | `/account/password` | Cliente (cierra las demás sesiones) |
| GET/POST | `/account/addresses` | Cliente |
| PUT/DELETE | `/account/addresses/:id` | Cliente (solo las propias) |
| GET | `/account/favorites` | Cliente |
| PUT/DELETE | `/account/favorites/:productId` | Cliente |

## Catálogo y tienda

| Método | Ruta | Acceso | Notas |
|---|---|---|---|
| GET | `/products` | Público | `q, category, minPrice, maxPrice` (pesos), `available, featured, onSale, bestSellers, sort (popular\|newest\|price_asc\|price_desc\|name), page, pageSize`. Solo publicados; no expone existencias exactas. |
| GET | `/products/:slug` | Público | Incluye variantes y opciones activas. |
| GET | `/categories` | Público | Con conteo de productos publicados. |
| GET | `/store` | Público | Configuración pública (contacto, entregas, `paymentsEnabled`). |
| GET | `/availability?date=AAAA-MM-DD` | Público | Franjas con cupo restante, considerando la anticipación del carrito actual. |

## Carrito (invitado o cliente)

El invitado se identifica con la cookie `mafer_cart`; al iniciar sesión su carrito se fusiona con el de la cuenta.

| Método | Ruta | Cuerpo |
|---|---|---|
| GET | `/cart` | — |
| POST | `/cart/items` | `productId, variantId?, quantity, selections: { [optionId]: valueId \| valueId[] \| texto }` |
| PATCH | `/cart/items/:id` | `quantity` |
| DELETE | `/cart/items/:id` | — |

La respuesta siempre trae precios **actuales** recalculados; artículos con problemas llevan `issue` y no suman al subtotal.

## Pedidos

| Método | Ruta | Acceso | Notas |
|---|---|---|---|
| POST | `/orders/quote` | Cliente | Cotización (subtotal, descuento, envío, impuestos, total, `leadHours`). No reserva nada. |
| POST | `/orders` | Cliente | `deliveryMethod, addressId?, requestedDate, slotId, couponCode?, notes?, acceptTerms:true, idempotencyKey (uuid), expectedTotalCents`. 409 `PRICE_CHANGED` si el total cambió; 409 `OUT_OF_STOCK`; misma clave → mismo pedido. |
| GET | `/orders` | Cliente | Solo los propios. |
| GET | `/orders/:id` | Cliente | 404 si no es del usuario. |
| POST | `/orders/:id/cancel` | Cliente | Solo pendientes de pago; expira la sesión de Stripe y libera existencias. |

## Pagos

| Método | Ruta | Acceso | Notas |
|---|---|---|---|
| POST | `/payments/checkout-session` | Cliente | `orderId`. Devuelve `{ url }` de Stripe Checkout (reutiliza la sesión abierta). 503 si Stripe no está configurado. |
| POST | `/payments/sync/:orderId` | Cliente | Consulta el estado real en Stripe. |
| GET | `/payments/:id` | Cliente | Solo pagos propios. |
| POST | `/webhooks/stripe` | Stripe | Cuerpo crudo + `Stripe-Signature`. Ver [STRIPE.md](STRIPE.md). |

## Administración (`/admin/*`, rol ADMIN)

| Recurso | Rutas |
|---|---|
| Dashboard | `GET /admin/dashboard` |
| Categorías | `GET/POST /admin/categories`, `PUT/DELETE /admin/categories/:id` (no elimina si tiene productos) |
| Productos | `GET/POST /admin/products`, `GET/PUT/DELETE /admin/products/:id` (con pedidos → se archiva), `PATCH /admin/products/:id/status` |
| Imágenes | `POST /admin/uploads` (multipart `image`, JPG/PNG/WEBP ≤ 5 MB, firma de archivo validada) |
| Inventario | `GET /admin/inventory`, `GET /admin/inventory/movements`, `POST /admin/inventory/:id/adjust` (`type IN\|OUT\|ADJUSTMENT, quantity, reason`) |
| Pedidos | `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status` (solo transiciones válidas; nunca cambia el pago), `PATCH /admin/orders/:id/notes` |
| Clientes | `GET /admin/customers`, `GET /admin/customers/:id`, `PATCH /admin/customers/:id/active` |
| Pagos | `GET /admin/payments`, `POST /admin/payments/:id/refunds` (`amountCents, reason?, confirm:true`) |
| Cupones | `GET/POST /admin/coupons`, `PUT /admin/coupons/:id` |
| Configuración | `GET/PUT /admin/settings`, `GET /admin/delivery`, `POST/PUT /admin/delivery/slots[/:id]`, `POST/DELETE /admin/delivery/blocked-dates[/:id]` |
| Auditoría | `GET /admin/audit` |

Transiciones de pedido permitidas:

```
PENDING_PAYMENT → CANCELLED
CONFIRMED       → IN_PREPARATION | CANCELLED
IN_PREPARATION  → READY | CANCELLED
READY           → OUT_FOR_DELIVERY (solo domicilio) | DELIVERED | CANCELLED
OUT_FOR_DELIVERY→ DELIVERED | READY
```
