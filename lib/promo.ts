import { drop, type PromoCodeConfig } from "@/config/drop";
import { formatEuros } from "@/lib/format";

/**
 * Codes de réduction : la liste est dans config/drop.ts (`promoCodes`). Le site vérifie le code
 * côté serveur et calcule la remise ; le navigateur n'est jamais cru sur parole.
 */

export type Promo = { code: string; label: string; discount: number };
export type PromoResult = { ok: true; promo: Promo } | { ok: false; error: string };

export const normalizeCode = (raw: unknown): string => (typeof raw === "string" ? raw.trim().toUpperCase() : "");

/**
 * @param subtotal total des pièces en centimes (livraison exclue)
 * @param codes liste des codes (paramétrable pour les tests)
 */
export function lookupPromo(rawCode: unknown, subtotal: number, now = new Date(), codes: PromoCodeConfig[] = drop.promoCodes): PromoResult {
  const code = normalizeCode(rawCode);
  const invalid = { ok: false, error: "Ce code n'est pas valable." } as const;
  const found = /^[A-Z0-9_-]{3,40}$/.test(code) ? codes.find((c) => c.code.toUpperCase() === code) : undefined;
  if (!found) return invalid;
  if (found.expiresAt && new Date(found.expiresAt) < now) return { ok: false, error: "Ce code a expiré." };
  if (found.minSubtotal && subtotal < found.minSubtotal) return { ok: false, error: `Ce code demande une commande d'au moins ${formatEuros(found.minSubtotal)}.` };

  let discount = 0;
  if (found.percentOff) discount = Math.round((subtotal * found.percentOff) / 100);
  else if (found.amountOff) discount = Math.min(found.amountOff, subtotal);
  if (discount <= 0) return invalid;
  return { ok: true, promo: { code: found.code.toUpperCase(), label: found.label || found.code, discount } };
}
