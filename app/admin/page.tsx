import { drop } from "@/config/drop";
import { isAdmin } from "@/lib/admin-auth";
import { formatAddress, loadAdminData } from "@/lib/admin-data";
import { getNow } from "@/lib/drop-state";
import { formatEuros } from "@/lib/format";
import { formatPieceNumber } from "@/lib/email";
import { logout, sendEarlyAccessLinks } from "./actions";
import { LoginForm } from "./LoginForm";

const STATUS: Record<string, string> = { paid: "Payée", needs_refund: "À REMBOURSER", refunded: "Remboursée" };

export default async function AdminPage() {
  if (!(await isAdmin())) return <LoginForm />;

  let data;
  try {
    data = await loadAdminData();
  } catch (e) {
    return <p className="p-8 font-bold text-orange">Erreur de chargement : {e instanceof Error ? e.message : String(e)}</p>;
  }
  const totals = new Map(drop.designs.map((d) => [d.id, Object.values(d.stock).reduce((a, b) => a + b, 0)]));
  const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "America/Guadeloupe", dateStyle: "short", timeStyle: "short" });
  const box = "rounded-3xl border border-line bg-surface p-6";

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Admin · {drop.name}</h1>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-ghost !min-h-11" href="/admin/export/orders">Export commandes (CSV)</a>
          <a className="btn btn-ghost !min-h-11" href="/admin/export/waitlist">Export liste d&apos;attente (CSV)</a>
          <form action={logout}><button className="btn btn-primary !min-h-11" type="submit">Déconnexion</button></form>
        </div>
      </header>

      {data.needsRefund > 0 && (
        <p role="alert" className="rounded-3xl bg-orange p-5 font-bold text-night">
          {data.needsRefund} commande(s) payée(s) alors que le stock était épuisé : à rembourser dans Stripe.
        </p>
      )}

      <section aria-labelledby="seuil" className={box}>
        <h2 id="seuil" className="text-xl font-black">Seuil de fabrication</h2>
        <p className={`mt-2 rounded-2xl p-4 text-lg font-black ${data.thresholdReached ? "bg-green/20" : "bg-sun/25"}`}>
          {data.thresholdReached ? "✅ Seuil atteint : la fabrication peut être lancée." : "⏳ Seuil non atteint."}
        </p>
        <ul className="mt-3 space-y-1">
          <li>
            Commandes payées : <strong>{data.totalOrders}</strong> / {drop.production.minOrders} minimum
            {data.totalOrders >= drop.production.minOrders ? " ✅" : " ❌"}
          </li>
          {data.perDesign.map((d) => (
            <li key={d.id}>
              {d.name} : <strong>{d.orders}</strong> commande(s) / {drop.production.minOrdersPerDesign} minimum {d.ordersOk ? "✅" : "❌"}
              <span className="text-muted"> ({d.pieces} pièces vendues sur {totals.get(d.id)})</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="early" className={box}>
          <h2 id="early" className="text-xl font-black">Early bird</h2>
          <p className="mt-2 text-3xl font-black">{data.earlyBird.used} / {data.earlyBird.max}</p>
          <p className="text-muted">pièces vendues au prix early bird · {data.earlyBird.active ? "encore actif" : "terminé"}</p>
        </section>
        <section aria-labelledby="wl" className={box}>
          <h2 id="wl" className="text-xl font-black">Liste d&apos;attente</h2>
          <p className="mt-2 text-3xl font-black">{data.waitlist.active}</p>
          <p className="text-muted">inscrits actifs · {data.waitlist.accessSent} ont reçu leur accès anticipé · {data.waitlist.unsubscribed} désinscrits</p>
          <form action={sendEarlyAccessLinks} className="mt-4">
            <button className="btn btn-primary !min-h-11" type="submit">Envoyer les liens d&apos;accès anticipé</button>
            <p className="mt-2 text-sm text-muted">Envoie le lien à ceux qui ne l&apos;ont pas encore reçu (100 max par clic). Le lien ne fonctionne que dans les {drop.earlyAccessHours} h avant l&apos;ouverture.</p>
          </form>
        </section>
      </div>

      <section aria-labelledby="stock" className={box}>
        <h2 id="stock" className="text-xl font-black">Stock restant</h2>
        <div className="mt-3 grid gap-6 md:grid-cols-2">
          {data.stockByDesign.map((d) => (
            <table key={d.id} className="w-full text-left text-sm">
              <caption className="mb-2 text-left font-bold">{d.name}</caption>
              <thead><tr className="border-b border-line"><th className="py-1">Taille</th><th>Dispo</th><th>Vendues</th><th>Réservées</th><th>Total</th></tr></thead>
              <tbody>
                {d.sizes.map((s) => (
                  <tr key={s.size} className="border-b border-line">
                    <th className="py-1">{s.size}</th>
                    <td className={s.available === 0 ? "font-bold text-orange" : "font-bold"}>{s.available === 0 ? "Épuisé" : s.available}</td>
                    <td>{s.sold}</td><td>{s.reserved}</td><td>{s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </section>

      <section aria-labelledby="orders" className={box}>
        <h2 id="orders" className="text-xl font-black">Commandes ({data.orders.length})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead><tr className="border-b-2 border-ink/60"><th className="py-2 pr-3">Date</th><th className="pr-3">Client</th><th className="pr-3">Livraison</th><th className="pr-3">Pièces</th><th className="pr-3">Montant</th><th>Statut</th></tr></thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id} className="border-b border-line align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{fmt(o.created_at)}</td>
                  <td className="pr-3">{o.name}<br /><span className="text-muted">{o.email}{o.phone ? ` · ${o.phone}` : ""}</span></td>
                  <td className="pr-3">{o.delivery_method === "shipping" ? "Envoi" : "Main propre"}<br /><span className="text-muted">{formatAddress(o.shipping_address)}</span></td>
                  <td className="pr-3">
                    {o.order_items.map((i) => (
                      <div key={`${i.design_id}${i.piece_number}`}>
                        {drop.designs.find((d) => d.id === i.design_id)?.name} {i.size} · n°{formatPieceNumber(i.piece_number, totals.get(i.design_id) ?? 0)}
                        {i.pack ? " (pack)" : i.early_bird ? " (early)" : ""}
                      </div>
                    ))}
                  </td>
                  <td className="pr-3 font-bold">{formatEuros(o.amount_total)}</td>
                  <td className={o.status === "paid" ? "" : "font-bold text-orange"}>{STATUS[o.status] ?? o.status}</td>
                </tr>
              ))}
              {data.orders.length === 0 && <tr><td colSpan={6} className="py-6 text-muted">Aucune commande pour l&apos;instant.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-muted">Heure serveur : {getNow().toISOString()}</p>
    </main>
  );
}
