import { drop } from "@/config/drop";

/** Guide des tailles, replié par défaut. L'id « tailles » permet aux liens « Guide des tailles » de l'ouvrir. */
export function SizeGuide() {
  return (
    <section aria-label="Guide des tailles" className="mx-auto max-w-6xl px-5 pb-16">
      <details id="tailles" className="group scroll-mt-24 border-y border-line py-5">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-bold uppercase tracking-[0.2em]">
          Guide des tailles
          <span aria-hidden="true" className="text-xl transition-transform duration-200 group-open:rotate-45">+</span>
        </summary>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <caption className="sr-only">Mesures des t-shirts en centimètres</caption>
            <thead>
              <tr className="border-b border-line text-muted"><th className="py-2 pr-4 font-medium">Taille</th><th className="py-2 pr-4 font-medium">Poitrine</th><th className="py-2 font-medium">Longueur</th></tr>
            </thead>
            <tbody>
              {drop.sizeGuide.map((r) => (
                <tr key={r.size} className="border-b border-line"><th className="py-2 pr-4">{r.size}</th><td className="py-2 pr-4">{r.chest} cm</td><td className="py-2">{r.length} cm</td></tr>
              ))}
            </tbody>
          </table>
          {/* Rappel pour toi seul(e) : reste invisible pour les acheteurs (voir README, mesures à faire confirmer par le fournisseur). */}
          {process.env.NODE_ENV !== "production" && <p className="mt-3 text-xs text-orange">[MESURES À CONFIRMER]</p>}
        </div>
      </details>
    </section>
  );
}
