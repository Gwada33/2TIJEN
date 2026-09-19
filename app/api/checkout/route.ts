import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { drop, getDesign } from "@/config/drop";
import { canPurchase, getNow } from "@/lib/drop-state";
import { CartError, computeQuote, validateCart } from "@/lib/pricing";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/supabase";
import { isValidAccessToken } from "@/lib/waitlist";

/**
 * Crée une session de paiement Stripe.
 * Le navigateur envoie seulement { cart: [{designId, size, qty}], delivery, accessToken }.
 * Le prix, le stock et l'early bird sont calculés ICI, côté serveur.
 */
export async function POST(request: NextRequest) {
  if (!(await allowRequest(`checkout:${clientIp(request)}`, 60, 10))) {
    return Response.json({ error: "Trop de tentatives, réessaie dans une minute." }, { status: 429 });
  }

  let body: { cart?: unknown; delivery?: unknown; accessToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  // 1. La vente est-elle ouverte pour ce visiteur ?
  const now = getNow();
  const token = typeof body.accessToken === "string" ? body.accessToken : null;
  const hasToken = token ? await isValidAccessToken(token) : false;
  if (!canPurchase(now, hasToken)) {
    return Response.json({ error: "La précommande n'est pas ouverte." }, { status: 403 });
  }

  // 2. Panier et mode de livraison validés.
  let cart;
  try {
    cart = validateCart(body.cart);
  } catch (e) {
    if (e instanceof CartError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
  const delivery = body.delivery === "shipping" ? "shipping" : "pickup";

  // 3. Réservation atomique du stock (15 min) : impossible de survendre.
  const { data: reserved, error: reserveError } = await db().rpc("reserve_stock", {
    p_items: cart.map((l) => ({ design_id: l.designId, size: l.size, qty: l.qty })),
    p_minutes: drop.reservationMinutes,
    p_scope: drop.designs.map((d) => d.id),
  });
  if (reserveError) {
    const soldOut = /SOLD_OUT:([^:]+):(\w+)/.exec(reserveError.message);
    if (soldOut) {
      const name = getDesign(soldOut[1])?.name ?? soldOut[1];
      return Response.json(
        { error: `Désolé, ${name} en taille ${soldOut[2]} n'est plus disponible.`, soldOut: true },
        { status: 409 },
      );
    }
    console.error("reserve_stock", reserveError.message);
    return Response.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }
  const { reservation_id: reservationId, pieces_before: piecesBefore } = reserved[0];

  // À partir d'ici, toute erreur doit libérer la réservation.
  const release = () => db().rpc("release_reservation", { p_reservation: reservationId, p_session: null });

  try {
    // 4. Prix calculé côté serveur, enregistré sur les pièces réservées.
    const quote = computeQuote(cart, piecesBefore, now);

    const { data: rows, error: rowsError } = await db()
      .from("reservation_items")
      .select("id, design_id, size")
      .eq("reservation_id", reservationId)
      .order("id");
    if (rowsError) throw new Error(rowsError.message);
    const queues = new Map<string, number[]>();
    for (const r of rows) {
      const key = `${r.design_id}:${r.size}`;
      queues.set(key, [...(queues.get(key) ?? []), r.id]);
    }
    const priced = quote.units.map((u) => ({
      id: queues.get(`${u.designId}:${u.size}`)!.shift()!,
      unit_amount: u.allocatedAmount,
      early_bird: u.earlyBird && !u.pack,
      pack: u.pack,
    }));
    const { error: priceError } = await db().rpc("price_reservation", {
      p_reservation: reservationId,
      p_units: priced,
    });
    if (priceError) throw new Error(priceError.message);

    // 5. Session Stripe Checkout (page de paiement hébergée par Stripe).
    const shipping =
      delivery === "shipping"
        ? { label: drop.shipping.metropoleLabel, amount: drop.shipping.metropolePrice }
        : { label: drop.shipping.pickupLabel, amount: drop.shipping.pickupPrice };

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: quote.lines.map((l) => ({
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
      ...(delivery === "shipping"
        ? {
            shipping_address_collection: {
              allowed_countries: drop.shipping.metropoleCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
            },
          }
        : {}),
      phone_number_collection: { enabled: true },
      client_reference_id: reservationId,
      metadata: { reservation_id: reservationId, delivery, drop: drop.name },
      locale: "fr",
      // Stripe impose un minimum de 30 min ; le stock, lui, n'est gardé que 15 min.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: `${siteUrl()}/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/#pieces`,
    });

    await db().rpc("attach_stripe_session", { p_reservation: reservationId, p_session: session.id });
    return Response.json({ url: session.url });
  } catch (e) {
    console.error("checkout", e);
    await release();
    return Response.json({ error: "Impossible de lancer le paiement, réessaie." }, { status: 502 });
  }
}
