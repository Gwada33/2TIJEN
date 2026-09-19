import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { drop } from "@/config/drop";
import { requireEnv } from "@/lib/env";
import { sendOrderConfirmation, sendRefundNotice, type ConfirmationOrder } from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/supabase";

/**
 * Webhook Stripe. Stripe appelle cette adresse après chaque paiement.
 * - la signature est vérifiée (sinon 400 : personne ne peut fabriquer de fausse commande) ;
 * - le traitement est idempotent : un événement rejoué ne crée pas une 2e commande ;
 * - une erreur de base ou d'e-mail renvoie 500 : Stripe réessaie automatiquement.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Signature manquante", { status: 400 });

  // Le corps BRUT est indispensable pour vérifier la signature.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Paiement différé (ex. virement) : on attend l'événement « async_payment_succeeded ».
        if (session.payment_status === "paid") await fulfil(session);
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await db().rpc("release_reservation", { p_reservation: null, p_session: session.id });
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error(`webhook ${event.type} ${event.id}`, e);
    return new Response("Erreur de traitement", { status: 500 });
  }

  return new Response("ok");
}

async function fulfil(session: Stripe.Checkout.Session) {
  const reservationId = session.metadata?.reservation_id ?? session.client_reference_id;
  if (!reservationId) throw new Error(`Session ${session.id} sans réservation`);

  const delivery = session.metadata?.delivery === "shipping" ? "shipping" : "pickup";
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address ?? session.customer_details?.address ?? null;
  const email = session.customer_details?.email;
  if (!email) throw new Error(`Session ${session.id} sans e-mail`);
  const name = shipping?.name ?? session.customer_details?.name ?? null;

  const { data, error } = await db().rpc("complete_order", {
    p_session_id: session.id,
    p_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
    p_reservation: reservationId,
    p_drop_name: drop.name,
    p_email: email,
    p_name: name,
    p_phone: session.customer_details?.phone ?? null,
    p_delivery: delivery,
    p_address: delivery === "shipping" ? address : null,
    p_amount_total: session.amount_total ?? 0,
    p_shipping_amount: session.total_details?.amount_shipping ?? 0,
  });
  if (error) throw new Error(`complete_order : ${error.message}`);

  const result = data as { status: string; order_id?: string; items?: ConfirmationOrder["items"] };

  if (result.status === "oversold") {
    // Paiement arrivé après expiration alors que le stock est parti : remboursement automatique.
    const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (intent) await stripe().refunds.create({ payment_intent: intent });
    await db().from("orders").update({ status: "refunded" }).eq("id", result.order_id!);
    await sendRefundNotice(email);
    return;
  }
  if (result.status === "unknown_reservation") throw new Error(`Réservation inconnue pour ${session.id}`);

  // « created » ou « duplicate » : on envoie l'e-mail s'il n'est pas déjà parti
  // (permet de rattraper un échec d'envoi lors d'un rejeu de Stripe).
  const orderId = result.order_id!;
  const { data: order, error: orderError } = await db()
    .from("orders")
    .select("email, name, delivery_method, amount_total, confirmation_sent_at, order_items(design_id, size, piece_number)")
    .eq("id", orderId)
    .single();
  if (orderError) throw new Error(orderError.message);
  if (order.confirmation_sent_at) return;

  const totals = await db().from("designs").select("id, total_pieces");
  const totalByDesign = new Map((totals.data ?? []).map((d) => [d.id, d.total_pieces as number]));
  await sendOrderConfirmation({
    email: order.email,
    name: order.name,
    deliveryMethod: order.delivery_method,
    amountTotal: order.amount_total,
    items: order.order_items
      .sort((a, b) => a.design_id.localeCompare(b.design_id) || a.piece_number - b.piece_number)
      .map((i) => ({ ...i, total_pieces: totalByDesign.get(i.design_id) ?? 0 })),
  });
  await db().from("orders").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", orderId);
}
