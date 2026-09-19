import type { Metadata } from "next";
import Link from "next/link";
import { drop, getDesign } from "@/config/drop";
import { SiteFooter } from "@/components/SiteFooter";
import { formatPieceNumber } from "@/lib/email";
import { db } from "@/lib/supabase";

export const metadata: Metadata = { title: "Merci !", robots: { index: false } };

export default async function Merci({ searchParams }: PageProps<"/merci">) {
  const { session_id } = await searchParams;
  const sessionId = typeof session_id === "string" && /^cs_[A-Za-z0-9_]+$/.test(session_id) ? session_id : null;

  // Le webhook Stripe peut mettre quelques secondes à enregistrer la commande.
  let items: { design_id: string; size: string; piece_number: number; total: number }[] = [];
  if (sessionId) {
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
        <h1 className="font-black text-5xl uppercase leading-none">Merci !</h1>
        <p className="mt-6 text-lg">Ton paiement est bien reçu. Tu vas recevoir un e-mail de confirmation avec le numéro de ta pièce.</p>
        {items.length > 0 ? (
          <ul className="mx-auto mt-8 max-w-sm space-y-2 rounded-3xl bg-pink-soft p-6 text-left font-bold">
            {items.map((i) => (
              <li key={`${i.design_id}${i.piece_number}`} className="flex justify-between gap-4">
                <span>{getDesign(i.design_id)?.name} · {i.size}</span>
                <span>N° {formatPieceNumber(i.piece_number, i.total)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-muted">Ta commande est en cours d&apos;enregistrement : ton numéro de pièce arrive par e-mail dans quelques instants.</p>
        )}
        <p className="mt-8 text-muted">Précommande : fabrication après la clôture. Délai annoncé : {drop.deliveryDelay}.</p>
        <Link href="/" className="btn btn-primary mt-10">Retour au site</Link>
      </main>
      <SiteFooter />
    </>
  );
}
