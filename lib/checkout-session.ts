import type Stripe from "stripe";
import { drop } from "@/config/drop";
import type { Quote } from "@/lib/pricing";

/**
 * Paramètres de la session Stripe Checkout, construits à partir d'un devis CALCULÉ PAR LE SERVEUR.
 * Fonction pure (sans appel réseau) : elle est testée dans tests/checkout-session.test.ts.
 */
export function buildCheckoutParams(o: {
  quote: Quote;
  delivery: "pickup" | "shipping";
  /** Identifiant de la réservation (ou de la commande de démo), renvoyé par Stripe dans le webhook. */
  reference: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  /** « Maintenant » en secondes Unix (paramétrable pour les tests). */
  nowSeconds?: number;
}): Stripe.Checkout.SessionCreateParams {
  const shipping =
    o.delivery === "shipping"
      ? { label: drop.shipping.metropoleLabel, amount: drop.shipping.metropolePrice }
      : { label: drop.shipping.pickupLabel, amount: drop.shipping.pickupPrice };

  return {
    mode: "payment",
    line_items: o.quote.lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: "eur",
        unit_amount: l.unitAmount,
        product_data: { name: l.label },
      },
    })),
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: shipping.label,
          fixed_amount: { amount: shipping.amount, currency: "eur" },
        },
      },
    ],
    ...(o.delivery === "shipping"
      ? {
          shipping_address_collection: {
            allowed_countries: drop.shipping.metropoleCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
          },
        }
      : {}),
    phone_number_collection: { enabled: true },
    client_reference_id: o.reference,
    metadata: o.metadata,
    locale: "fr",
    // Stripe impose un minimum de 30 min ; le stock, lui, n'est gardé que 15 min.
    expires_at: (o.nowSeconds ?? Math.floor(Date.now() / 1000)) + 31 * 60,
    success_url: o.successUrl,
    cancel_url: o.cancelUrl,
  };
}
