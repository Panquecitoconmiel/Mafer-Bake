import Stripe from "stripe";
import { env } from "./env.js";

let client: Stripe | null = null;

/** Cliente de Stripe, o null si no hay STRIPE_SECRET_KEY configurada. */
export function getStripe(): Stripe | null {
  if (!env.stripeEnabled) return null;
  if (!client) client = new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 });
  return client;
}

/** Permite sustituir el cliente en pruebas automatizadas. */
export function setStripeForTests(mock: Stripe | null) {
  client = mock;
}
