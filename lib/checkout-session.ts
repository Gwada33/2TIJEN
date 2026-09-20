import type Stripe from "stripe";
import { drop } from "@/config/drop";
import type { Quote } from "@/lib/pricing";

/** Stripe Tax est activé par STRIPE_AUTOMATIC_TAX=1, et seulement après avoir déclaré une immatriculation dans Stripe (voir README). */
export const automaticTaxEnabled = () => process.env.STRIPE_AUTOMATIC_TAX === "1";

/** Étiquette qui permet de suivre ce tunnel de paiement dans le Dashboard Stripe (API 2026-03-25 ou plus récente). */
const INTEGRATION_IDENTIFIER = "2tijen-precommande-kqzvfhaw";

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
  /** Active Stripe Tax (calcul automatique de la TVA). Ne rien percevoir tant qu'aucune immatriculation n'est déclarée dans Stripe. */
  automaticTax?: boolean;
}): Stripe.Checkout.SessionCreateParams {
  // Les prix du site sont des prix TTC : la TVA, si elle est calculée, est INCLUSE dans le prix.
  const taxBehavior = o.automaticTax ? ({ tax_behavior: "inclusive" } as const) : {};
  const shipping =
    o.delivery === "shipping"
      ? { label: drop.shipping.metropoleLabel, amount: drop.shipping.metropolePrice }
      : { label: drop.shipping.pickupLabel, amount: drop.shipping.pickupPrice };

  return {
    mode: "payment",
    // Paramètre de l'API récente, pas encore dans les types du SDK.
    ...({ integration_identifier: INTEGRATION_IDENTIFIER } as object),
    line_items: o.quote.lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: "eur",
        unit_amount: l.unitAmount,
        ...taxBehavior,
        product_data: { name: l.label, ...(o.automaticTax ? { tax_code: drop.tax.productCode } : {}) },
      },
    })),
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: shipping.label,
          fixed_amount: { amount: shipping.amount, currency: "eur" },
          ...taxBehavior,
          ...(o.automaticTax ? { tax_code: drop.tax.shippingCode } : {}),
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
    ...(o.automaticTax ? { automatic_tax: { enabled: true } } : {}),
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
