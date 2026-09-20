import { describe, expect, it } from "vitest";
import { drop } from "@/config/drop";
import { buildCheckoutParams } from "@/lib/checkout-session";
import { computeQuote } from "@/lib/pricing";

const NOW = new Date("2026-10-13T10:00:00-04:00");
const base = { reference: "res_1", metadata: { reservation_id: "res_1" }, successUrl: "https://x/merci?session_id={CHECKOUT_SESSION_ID}", cancelUrl: "https://x/#pieces" };

describe("session Stripe Checkout", () => {
  const cart = [
    { designId: "guadeloupean", size: "M" as const, qty: 2 },
    { designId: "martinican", size: "L" as const, qty: 1 },
  ];

  it("le total des lignes Stripe est exactement le total calculé par le serveur", () => {
    const quote = computeQuote(cart, 0, NOW);
    const p = buildCheckoutParams({ ...base, quote, delivery: "pickup" });
    const sum = p.line_items!.reduce((n, l) => n + l.price_data!.unit_amount! * l.quantity!, 0);
    expect(sum).toBe(quote.total);
  });

  it("montants entiers en centimes > 0, noms courts, devise eur", () => {
    const p = buildCheckoutParams({ ...base, quote: computeQuote(cart, 20, NOW), delivery: "pickup" });
    for (const l of p.line_items!) {
      expect(Number.isInteger(l.price_data!.unit_amount)).toBe(true);
      expect(l.price_data!.unit_amount!).toBeGreaterThan(0);
      expect(l.price_data!.currency).toBe("eur");
      expect(l.price_data!.product_data!.name.length).toBeLessThanOrEqual(250);
    }
  });

  it("retrait : livraison gratuite, pas d'adresse demandée", () => {
    const p = buildCheckoutParams({ ...base, quote: computeQuote(cart, 0, NOW), delivery: "pickup" });
    expect(p.shipping_options![0].shipping_rate_data!.fixed_amount!.amount).toBe(drop.shipping.pickupPrice);
    expect(p.shipping_address_collection).toBeUndefined();
  });

  it("envoi métropole : frais de la config et adresse demandée en France", () => {
    const p = buildCheckoutParams({ ...base, quote: computeQuote(cart, 0, NOW), delivery: "shipping" });
    expect(p.shipping_options![0].shipping_rate_data!.fixed_amount!.amount).toBe(drop.shipping.metropolePrice);
    expect(p.shipping_address_collection!.allowed_countries).toEqual(["FR"]);
  });

  it("expiration entre 30 min et 24 h (règle Stripe), téléphone collecté, référence renvoyée", () => {
    const now = 1_800_000_000;
    const p = buildCheckoutParams({ ...base, quote: computeQuote(cart, 0, NOW), delivery: "pickup", nowSeconds: now });
    expect(p.expires_at! - now).toBeGreaterThanOrEqual(30 * 60);
    expect(p.expires_at! - now).toBeLessThanOrEqual(24 * 3600);
    expect(p.phone_number_collection).toEqual({ enabled: true });
    expect(p.client_reference_id).toBe("res_1");
    expect(p.mode).toBe("payment");
  });

  it("Stripe Tax désactivé par défaut : aucun champ fiscal envoyé", () => {
    const p = buildCheckoutParams({ ...base, quote: computeQuote(cart, 0, NOW), delivery: "pickup" });
    expect(p.automatic_tax).toBeUndefined();
    expect(p.line_items![0].price_data!.tax_behavior).toBeUndefined();
  });

  it("Stripe Tax activé : prix TTC (inclusive), codes fiscaux de la config, livraison incluse", () => {
    const p = buildCheckoutParams({ ...base, quote: computeQuote(cart, 0, NOW), delivery: "shipping", automaticTax: true });
    expect(p.automatic_tax).toEqual({ enabled: true });
    for (const l of p.line_items!) {
      expect(l.price_data!.tax_behavior).toBe("inclusive");
      expect(l.price_data!.product_data!.tax_code).toBe(drop.tax.productCode);
    }
    const rate = p.shipping_options![0].shipping_rate_data!;
    expect(rate.tax_behavior).toBe("inclusive");
    expect(rate.tax_code).toBe(drop.tax.shippingCode);
  });

  it("n'utilise jamais payment_method_types (méthodes de paiement dynamiques)", () => {
    const p = buildCheckoutParams({ ...base, quote: computeQuote(cart, 0, NOW), delivery: "pickup" });
    expect("payment_method_types" in p).toBe(false);
  });

  it("code promo : transmis à Stripe par son identifiant (jamais un montant venu du navigateur)", () => {
    const p = buildCheckoutParams({ ...base, quote: computeQuote(cart, 0, NOW), delivery: "pickup", promotionCodeId: "promo_123" });
    expect(p.discounts).toEqual([{ promotion_code: "promo_123" }]);
    const none = buildCheckoutParams({ ...base, quote: computeQuote(cart, 0, NOW), delivery: "pickup" });
    expect(none.discounts).toBeUndefined();
  });
});
