import "server-only";
import { drop } from "@/config/drop";
import { sendOrderConfirmation, sendRefundNotice, type ConfirmationOrder } from "@/lib/email";
import { amountToCents, getCheckout, refundTransaction } from "@/lib/sumup";
import { db } from "@/lib/supabase";

/** Coordonnées et montants enregistrés avec la réservation, AVANT le paiement (les montants sont ceux calculés par le serveur). */
export type CheckoutCustomer = {
  email: string;
  name: string;
  phone: string | null;
  delivery: "pickup" | "shipping";
  address: { line1: string; postal_code: string; city: string; country: string } | null;
  amount_total: number;
  shipping_amount: number;
  promo_code: string | null;
  discount_amount: number;
};

/**
 * Vérifie auprès de SumUp l'état d'un paiement, puis crée la commande s'il est payé.
 * Appelée par la notification de SumUp ET par la page « merci » : les deux se valent, et le
 * traitement est idempotent (un paiement ne crée jamais deux commandes).
 * Les notifications de SumUp ne sont pas signées : on ne croit que ce que l'API répond.
 */
export async function settleCheckout(checkoutId: string): Promise<"paid" | "pending" | "closed" | "unknown"> {
  const { data: reservation, error } = await db().from("reservations").select("id, customer").eq("checkout_id", checkoutId).maybeSingle();
  if (error) throw new Error(`reservations : ${error.message}`);
  if (!reservation?.customer) return "unknown"; // paiement qui ne vient pas de ce site

  const checkout = await getCheckout(checkoutId);
  if (checkout.status === "EXPIRED") {
    await db().rpc("release_reservation", { p_reservation: reservation.id, p_checkout: null });
    return "closed";
  }
  if (checkout.status !== "PAID") return "pending"; // en cours (ou refusé : la personne peut réessayer)

  const customer = reservation.customer as CheckoutCustomer;
  if (checkout.currency !== "EUR" || amountToCents(checkout.amount) !== customer.amount_total) {
    throw new Error(`Montant incohérent pour ${checkoutId} : SumUp ${checkout.amount} ${checkout.currency}, attendu ${customer.amount_total} cts`);
  }
  const transactionId = checkout.transactions?.find((t) => t.status === "SUCCESSFUL")?.id ?? checkout.transactions?.[0]?.id ?? null;
  await fulfil(checkoutId, transactionId, reservation.id, customer);
  return "paid";
}

async function fulfil(checkoutId: string, transactionId: string | null, reservationId: string, c: CheckoutCustomer) {
  const { data, error } = await db().rpc("complete_order", {
    p_checkout_id: checkoutId,
    p_transaction_id: transactionId,
    p_reservation: reservationId,
    p_drop_name: drop.name,
    p_email: c.email,
    p_name: c.name,
    p_phone: c.phone,
    p_delivery: c.delivery,
    p_address: c.delivery === "shipping" ? c.address : null,
    p_amount_total: c.amount_total,
    p_shipping_amount: c.shipping_amount,
  });
  if (error) throw new Error(`complete_order : ${error.message}`);

  const result = data as { status: string; order_id?: string; items?: ConfirmationOrder["items"] };

  if (result.status === "oversold") {
    // Paiement arrivé après expiration alors que le stock est parti : remboursement automatique si possible.
    // Sinon la commande reste « à rembourser » et apparaît en alerte dans /admin.
    let refunded = false;
    if (transactionId) {
      try {
        await refundTransaction(transactionId);
        refunded = true;
      } catch (e) {
        console.error(`remboursement automatique impossible (${checkoutId})`, e);
      }
    }
    if (refunded) await db().from("orders").update({ status: "refunded" }).eq("id", result.order_id!);
    await sendRefundNotice(c.email, refunded);
    return;
  }
  // Code de réduction : on garde une trace (le montant payé, lui, est déjà celui après remise).
  if (result.order_id && (c.promo_code || c.discount_amount > 0)) {
    await db().from("orders").update({ promo_code: c.promo_code, discount_amount: c.discount_amount }).eq("id", result.order_id);
  }
  if (result.status === "unknown_reservation") throw new Error(`Réservation inconnue pour ${checkoutId}`);

  // « created » ou « duplicate » : on envoie l'e-mail s'il n'est pas déjà parti (rattrape un échec d'envoi).
  // Le webhook et la page « merci » peuvent arriver en même temps : on « réserve » l'envoi d'abord, pour n'écrire qu'un seul e-mail.
  const orderId = result.order_id!;
  const { data: claimed, error: claimError } = await db()
    .from("orders")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("confirmation_sent_at", null)
    .select("email, name, delivery_method, amount_total, order_items(design_id, size, piece_number)");
  if (claimError) throw new Error(claimError.message);
  const order = claimed?.[0];
  if (!order) return; // déjà envoyé (ou en cours d'envoi par l'autre appel)

  try {
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
  } catch (e) {
    await db().from("orders").update({ confirmation_sent_at: null }).eq("id", orderId); // permet de réessayer
    throw e;
  }
}
