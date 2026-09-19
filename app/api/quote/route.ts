import type { NextRequest } from "next/server";
import { drop, getDesign } from "@/config/drop";
import { getNow } from "@/lib/drop-state";
import { CartError, computeQuote, validateCart } from "@/lib/pricing";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { getStock, piecesTaken } from "@/lib/stock";

/**
 * Devis : le navigateur envoie son panier (design, taille, quantité) et reçoit
 * les prix calculés par le serveur. Aucun prix n'est jamais calculé côté navigateur.
 */
export async function POST(request: NextRequest) {
  if (!(await allowRequest(`quote:${clientIp(request)}`, 60, 60))) {
    return Response.json({ error: "Trop de requêtes, patiente un instant." }, { status: 429 });
  }
  let body: { cart?: unknown; delivery?: unknown };
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

  return Response.json({
    lines: quote.lines.map((l) => ({ label: l.label, unitAmount: l.unitAmount, quantity: l.quantity })),
    subtotal: quote.total,
    shipping,
    total: quote.total + shipping,
    pieces: quote.pieces,
    unavailable,
  });
}
