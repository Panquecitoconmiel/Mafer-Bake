# Stripe en Mafer

Mafer usa **Stripe Checkout** (página de pago alojada por Stripe), así que la tienda nunca recibe ni guarda datos de tarjetas.

## 1. Modo de prueba en local

1. Crea una cuenta en Stripe y, en modo **Prueba**, copia tus claves desde *Desarrolladores → Claves de API*.
2. En `server/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_CURRENCY=mxn
   ```
3. Instala la [Stripe CLI](https://docs.stripe.com/stripe-cli) e inicia sesión: `stripe login`.
4. Reenvía los webhooks a tu API local:
   ```bash
   stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe \
     --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,payment_intent.payment_failed,charge.refunded
   ```
   Copia el `whsec_...` que imprime en `STRIPE_WEBHOOK_SECRET` y reinicia el servidor.
5. Compra en la tienda y paga con una tarjeta de prueba:
   - `4242 4242 4242 4242` — pago exitoso
   - `4000 0000 0000 9995` — fondos insuficientes (rechazo)
   - `4000 0025 0000 3155` — requiere autenticación 3D Secure
   Cualquier fecha futura, cualquier CVC y cualquier código postal.

## 2. Flujo implementado

```
Carrito → POST /orders            (valida precios, fecha, cupón; aparta inventario; idempotente)
        → POST /payments/checkout-session  (importes desde el pedido guardado)
        → Stripe Checkout
        → webhook checkout.session.completed (firma verificada)
        → Pedido «Confirmado» + pago «Pagado»
```

| Evento | Efecto |
|---|---|
| `checkout.session.completed` | Si `payment_status = paid`, marca el pago y el pedido. Si es un método asíncrono, espera. |
| `checkout.session.async_payment_succeeded` | Marca como pagado. |
| `checkout.session.async_payment_failed` | Pago rechazado: cancela el pedido y libera existencias. |
| `checkout.session.expired` | La sesión (60 min) expiró sin pago: cancela y libera existencias. |
| `payment_intent.payment_failed` | Se registra; el cliente puede reintentar en la misma sesión. |
| `charge.refunded` | Actualiza importe reembolsado y estado (parcial/total). |

Garantías:

- **Firma verificada** con el cuerpo original de la petición (`express.raw` antes del parser JSON).
- **Idempotencia**: el id de cada evento se guarda en `WebhookEvent` dentro de la misma transacción. Un evento repetido devuelve `duplicate` y no se aplica dos veces; si el procesamiento falla, se revierte y Stripe reintenta.
- **Validación de importe y moneda**: si `amount_total` no coincide con el pedido, el evento se rechaza y queda registrado en la auditoría.
- **Sin cobros duplicados**: si ya hay una sesión abierta para el pedido se reutiliza; las llamadas a Stripe llevan `idempotencyKey`.
- **Página de éxito**: consulta a Stripe (`/payments/sync/:orderId`) y al servidor; nunca marca como pagado por sí misma.

## 3. Reembolsos

Desde **Panel → Pagos → Reembolsar**: total o parcial, con confirmación explícita. Se ejecutan con la API de Stripe (`refunds.create` con clave de idempotencia) y quedan en la auditoría. Por política, el reembolso no devuelve existencias al inventario.

## 4. Producción

1. Activa tu cuenta de Stripe y usa claves `sk_live_...` (el servidor avisa si detecta una clave de prueba en producción).
2. En *Desarrolladores → Webhooks* agrega el endpoint `https://TU-API/api/v1/webhooks/stripe` con los seis eventos de la tabla y copia su secreto en `STRIPE_WEBHOOK_SECRET`.
3. La API debe servirse por **HTTPS**.
4. Revisa en Stripe los métodos de pago habilitados para MXN. Si activas métodos asíncronos (p. ej. OXXO), el pedido permanecerá pendiente hasta el evento final.
