import type { Metadata } from "next";
import Link from "next/link";
import { drop, getDesign } from "@/config/drop";
import { SiteFooter } from "@/components/SiteFooter";
import { formatPieceNumber } from "@/lib/email";
import { demoOrder, demoPay, demoStripeEnabled, demoTotalFor } from "@/lib/demo-store";
import { stripe } from "@/lib/stripe";
import { demoMode } from "@/lib/stock";
import { db } from "@/lib/supabase";

export const metadata: Metadata = { title: "Merci !", robots: { index: false } };

export default async function Merci({ searchParams }: PageProps<"/merci">) {
  const { session_id, demo, demo_session } = await searchParams;
  const sessionId = typeof session_id === "string" && /^cs_[A-Za-z0-9_]+$/.test(session_id) ? session_id : null;

  // Le webhook Stripe peut mettre quelques secondes à enregistrer la commande.
  let items: { design_id: string; size: string; piece_number: number; total: number }[] = [];
  let demoPieces = demoMode() && typeof demo === "string" ? demoOrder(demo)?.pieces : null;
  // Démo avec vraie page Stripe (mode test) : sans webhook, on vérifie ici que Stripe a bien encaissé.
  let stripeTest = false;
  if (demoStripeEnabled() && typeof demo_session === "string" && /^cs_[A-Za-z0-9_]+$/.test(demo_session)) {
    try {
      const s = await stripe().checkout.sessions.retrieve(demo_session);
      if (s.payment_status === "paid" && s.metadata?.demo_order) {
        demoPieces = demoPay(s.metadata.demo_order).pieces;
        stripeTest = true;
      }
    } catch (e) {
      console.error("merci (démo Stripe)", e);
    }
  }
  if (demoPieces) {
    items = demoPieces.map((p) => ({ design_id: p.designId, size: p.size, piece_number: p.number, total: demoTotalFor(p.designId) }));
  } else if (sessionId) {
    try {
      const { data } = await db().from("orders").select("order_items(design_id, size, piece_number)").eq("stripe_session_id", sessionId).maybeSingle();
      const designs = await db().from("designs").select("id, total_pieces");
      const totals = new Map((designs.data ?? []).map((d) => [d.id, d.total_pieces as number]));
      items = (data?.order_items ?? []).map((i) => ({ ...i, total: totals.get(i.design_id) ?? 0 }));
    } catch (e) {
      console.error("merci", e);
    }
  }

  return (
    <>
      <main id="contenu" className="mx-auto max-w-2xl px-5 py-20 text-center">
        {demoPieces && (
          <p role="note" className="mb-8 rounded-2xl bg-sun p-3 text-sm font-bold text-night">
            {stripeTest ? "MODE TEST STRIPE : paiement de test, aucun vrai débit, aucun e-mail." : "SIMULATION : achat de test, aucun vrai paiement ni e-mail."}
          </p>
        )}
        <h1 className="font-heavy text-3xl uppercase tracking-wide">Merci !</h1>
        <p className="mt-6 text-lg">Paiement reçu. Ton e-mail de confirmation arrive avec le numéro de ta pièce.</p>
        {items.length > 0 ? (
          <ul className="mx-auto mt-8 max-w-sm space-y-2 rounded-3xl border border-line bg-surface p-6 text-left font-bold">
            {items.map((i) => (
              <li key={`${i.design_id}${i.piece_number}`} className="flex justify-between gap-4">
                <span>{getDesign(i.design_id)?.name} · {i.size}</span>
                <span>N° {formatPieceNumber(i.piece_number, i.total)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-muted">Commande en cours d&apos;enregistrement : ton numéro arrive par e-mail dans quelques instants.</p>
        )}
        <p className="mt-8 text-muted">Précommande · délai annoncé : {drop.deliveryDelay}.</p>
        <Link href="/" className="btn btn-primary mt-10">Retour au site</Link>
      </main>
      <SiteFooter />
    </>
  );
}
