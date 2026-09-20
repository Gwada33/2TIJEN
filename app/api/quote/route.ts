import type { NextRequest } from "next/server";
import { drop, getDesign } from "@/config/drop";
import { getNow } from "@/lib/drop-state";
import { CartError, computeQuote, validateCart } from "@/lib/pricing";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { lookupPromo, normalizeCode } from "@/lib/promo";
import { getStock, piecesTaken } from "@/lib/stock";

/**
 * Devis : le navigateur envoie son panier (design, taille, quantité) et reçoit
 * les prix calculés par le serveur. Aucun prix n'est jamais calculé côté navigateur.
 */
export async function POST(request: NextRequest) {
  if (!(await allowRequest(`quote:${clientIp(request)}`, 60, 60))) {
    return Response.json({ error: "Trop de requêtes, patiente un instant." }, { status: 429 });
  }
  let body: { cart?: unknown; delivery?: unknown; promo?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  let cart;
  try {
    cart = validateCart(body.cart);
  } catch (e) {
    if (e instanceof CartError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }

  const stock = await getStock();
  const unavailable = cart
    .filter((l) => (stock[l.designId]?.[l.size]?.available ?? 0) < l.qty)
    .map((l) => `${getDesign(l.designId)!.name} (${l.size})`);

  const quote = computeQuote(cart, piecesTaken(stock), getNow());
  const shipping = body.delivery === "shipping" ? drop.shipping.metropolePrice : drop.shipping.pickupPrice;

  // Code de réduction (vérifié côté serveur) : remise calculée sur le total des pièces, livraison exclue.
  let discount: { code: string; label: string; amount: number } | null = null;
  let promoError: string | null = null;
  if (normalizeCode(body.promo)) {
    // Essais de codes limités : impossible de deviner des codes en boucle.
    const r = (await allowRequest(`promo:${clientIp(request)}`, 60, 12))
      ? await lookupPromo(body.promo, quote.total, getNow())
      : ({ ok: false, error: "Trop d'essais, patiente une minute." } as const);
    if (r.ok) discount = { code: r.promo.code, label: r.promo.label, amount: r.promo.discount };
    else promoError = r.error;
  }

  return Response.json({
    discount,
    promoError,
    lines: quote.lines.map((l) => ({ label: l.label, unitAmount: l.unitAmount, quantity: l.quantity })),
    subtotal: quote.total,
    shipping,
    total: quote.total - (discount?.amount ?? 0) + shipping,
    pieces: quote.pieces,
    unavailable,
  });
}
