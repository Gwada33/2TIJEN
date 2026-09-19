import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { demoOrder } from "@/lib/demo-store";
import { formatEuros } from "@/lib/format";
import { demoMode } from "@/lib/stock";
import { payDemo } from "../actions";

export const metadata: Metadata = { title: "Paiement (simulation)", robots: { index: false } };

/** Fausse page de paiement, uniquement en mode démo (DEMO_NO_DB=1) : elle remplace Stripe pour tester le parcours. */
export default async function Page({ params, searchParams }: PageProps<"/demo-paiement/[id]">) {
  if (!demoMode()) notFound();
  const { id } = await params;
  const { erreur } = await searchParams;
  const order = demoOrder(id);

  return (
    <main id="contenu" className="mx-auto max-w-lg px-5 py-16">
      <p role="note" className="mb-6 rounded-2xl bg-sun p-4 text-center font-bold text-night">
        SIMULATION : aucune carte, aucun vrai paiement. Cette page remplace Stripe pour tester.
      </p>
      {!order ? (
        <>
          <p>Commande introuvable (le serveur a peut-être redémarré).</p>
          <Link href="/#pieces" className="mt-6 inline-block underline">Retour à la boutique</Link>
        </>
      ) : (
        <div className="rounded-[2rem] border border-line bg-surface p-6 sm:p-8">
          <h1 className="font-heavy text-xl uppercase">Paiement</h1>
          <ul className="mt-5 space-y-1">
            {order.quote.lines.map((l) => (
              <li key={l.label} className="flex justify-between gap-4 text-sm">
                <span>{l.quantity > 1 ? `${l.quantity} × ` : ""}{l.label}</span>
                <span className="font-bold">{formatEuros(l.unitAmount * l.quantity)}</span>
              </li>
            ))}
            <li className="flex justify-between text-sm"><span>Livraison</span><span className="font-bold">{order.shipping === 0 ? "Gratuite" : formatEuros(order.shipping)}</span></li>
            <li className="flex justify-between border-t border-line pt-3 font-heavy text-xl"><span>Total</span><span>{formatEuros(order.total)}</span></li>
          </ul>
          {typeof erreur === "string" && <p role="alert" className="mt-4 font-bold text-orange">{erreur}</p>}
          <form action={payDemo} className="mt-6">
            <input type="hidden" name="id" value={order.id} />
            <button type="submit" className="btn btn-primary w-full !pr-2.5">
              Payer {formatEuros(order.total)} (simulation)
              <span className="btn-disc" aria-hidden="true">→</span>
            </button>
          </form>
          <Link href="/#pieces" className="mt-4 block text-center text-sm text-muted underline">Annuler</Link>
        </div>
      )}
    </main>
  );
}
