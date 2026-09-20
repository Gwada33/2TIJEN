import "server-only";
import { stripe } from "@/lib/stripe";
import { formatEuros } from "@/lib/format";

/**
 * Codes de réduction : ils sont créés et gérés dans Stripe (Dashboard → Catalogue de produits →
 * Coupons → « Codes promotionnels »). Le site vérifie le code côté serveur, calcule la remise
 * à afficher, puis transmet le code à Stripe qui l'applique au paiement.
 */

export type Promo = { id: string; code: string; label: string; discount: number };
export type PromoResult = { ok: true; promo: Promo } | { ok: false; error: string };

export const normalizeCode = (raw: unknown): string => (typeof raw === "string" ? raw.trim().toUpperCase() : "");

/** @param subtotal total des pièces en centimes (livraison exclue) */
export async function lookupPromo(rawCode: unknown, subtotal: number): Promise<PromoResult> {
  const code = normalizeCode(rawCode);
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return { ok: false, error: "Ce code n'est pas valable." };

  let found;
  try {
    found = (await stripe().promotionCodes.list({ code, active: true, limit: 1, expand: ["data.promotion.coupon"] })).data[0];
  } catch (e) {
    console.error("promo", e);
    return { ok: false, error: "Codes promo indisponibles pour le moment." };
  }
  const coupon = found?.promotion?.coupon;
  const invalid = { ok: false, error: "Ce code n'est pas valable." } as const;
  if (!found || !coupon || typeof coupon === "string" || !found.active || !coupon.valid) return invalid;
  if (found.customer) return invalid; // code réservé à un client précis
  if (found.expires_at && found.expires_at * 1000 < Date.now()) return { ok: false, error: "Ce code a expiré." };
  if (found.max_redemptions !== null && found.times_redeemed >= found.max_redemptions) return { ok: false, error: "Ce code a déjà été utilisé au maximum." };
  const min = found.restrictions?.minimum_amount;
  if (min && subtotal < min) return { ok: false, error: `Ce code demande une commande d'au moins ${formatEuros(min)}.` };

  let discount = 0;
  if (coupon.percent_off) discount = Math.round((subtotal * coupon.percent_off) / 100);
  else if (coupon.amount_off) {
    if (coupon.currency && coupon.currency !== "eur") return invalid;
    discount = Math.min(coupon.amount_off, subtotal);
  }
  if (discount <= 0) return invalid;
  return { ok: true, promo: { id: found.id, code: found.code, label: coupon.name || found.code, discount } };
}
