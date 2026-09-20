import type { NextRequest } from "next/server";
import { settleCheckout } from "@/lib/fulfil";

/**
 * Notification SumUp (adresse `return_url` du paiement). SumUp envoie { event_type, id } quand l'état
 * d'un paiement change. Ces notifications NE SONT PAS SIGNÉES : on ne se fie qu'à l'identifiant, et
 * `settleCheckout` demande l'état réel à SumUp avant de créer quoi que ce soit.
 * - un paiement inconnu est ignoré (réponse 200) ;
 * - une erreur de base ou d'e-mail renvoie 500 : SumUp réessaie (1 min, 5 min, 20 min, 2 h).
 */
export async function POST(request: NextRequest) {
  let body: { event_type?: unknown; id?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response("Requête invalide", { status: 400 });
  }
  if (body.event_type !== "CHECKOUT_STATUS_CHANGED" || typeof body.id !== "string" || !/^[A-Za-z0-9-]{8,80}$/.test(body.id)) {
    return new Response("ok"); // autre événement : rien à faire
  }
  try {
    await settleCheckout(body.id);
  } catch (e) {
    console.error(`webhook SumUp ${body.id}`, e);
    return new Response("Erreur de traitement", { status: 500 });
  }
  return new Response("ok");
}
