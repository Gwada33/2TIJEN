import Image from "next/image";
import { drop, SIZES, type Size } from "@/config/drop";
import { Countdown } from "@/components/Countdown";
import { Ransom } from "@/components/Ransom";
import { Shop, type ShopDesign } from "@/components/Shop";
import { SiteFooter } from "@/components/SiteFooter";
import { WaitlistForm } from "@/components/WaitlistForm";
import { canPurchase, closesAt, getNow, getPhase, isEarlyAccessWindow, opensAt } from "@/lib/drop-state";
import { formatDateTime, formatDay, formatEuros } from "@/lib/format";
import { currentUnitPrice } from "@/lib/pricing";
import { fallbackStock, getStock, piecesTaken, type StockMap } from "@/lib/stock";
import { isValidAccessToken } from "@/lib/waitlist";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const now = getNow();
  const phase = getPhase(now);
  const token = typeof params.acces === "string" ? params.acces : null;

  // Accès anticipé : seulement dans les 24 h avant l'ouverture, avec un jeton valide.
  const earlyAccess = isEarlyAccessWindow(now) && (await isValidAccessToken(token));

  let stock: StockMap;
  let dbOk = true;
  try {
    stock = await getStock();
  } catch (e) {
    console.error("Stock indisponible", e);
    stock = fallbackStock();
    dbOk = false;
  }

  const buyable = dbOk && canPurchase(now, earlyAccess);
  const mode = buyable ? "open" : phase === "closed" ? "closed" : "before";
  const taken = piecesTaken(stock);
  const unit = currentUnitPrice(taken, now);
  const earlyBirdLeft = unit.earlyBird ? Math.max(drop.earlyBird.maxPieces - taken, 0) : null;

  const designs: ShopDesign[] = drop.designs.map((d) => ({
    id: d.id,
    name: d.name,
    accent: d.accent,
    images: d.images,
    alt: d.alt,
    available: Object.fromEntries(SIZES.map((s) => [s, stock[d.id]?.[s]?.available ?? 0])) as Record<Size, number>,
  }));

  const opensLabel = formatDateTime(opensAt());
  const waitlistOpen = phase !== "open"; // avant ouverture ou après clôture

  const cta =
    mode === "open"
      ? { href: "#pieces", label: "Je précommande" }
      : { href: "#liste", label: phase === "closed" ? "Je rejoins la liste du drop 2" : "Je m'inscris à la liste d'attente" };

  const countdown =
    phase === "closed"
      ? null
      : phase === "open"
        ? { target: drop.closesAt, label: "Clôture de la préco dans" }
        : { target: drop.opensAt, label: earlyAccess ? "Ouverture publique dans" : "Ouverture de la préco dans" };

  return (
    <>
      <header className="sticky top-0 z-30 bg-night/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#" className="group flex items-center gap-2 font-heavy text-lg tracking-wide" aria-label={`${drop.brand}, retour en haut`}>
            <Image src="/logo-2t-white.png" alt="" width={28} height={28} className="h-7 w-auto transition-transform duration-300 group-hover:rotate-[-12deg] group-hover:scale-110" />
            {drop.brand}
          </a>
          <a href={cta.href} className="btn btn-primary !min-h-11 !gap-2 !pl-4 !pr-2 !text-[0.65rem]">{mode === "open" ? "Précommander" : "Liste"}<span className="btn-disc !h-7 !w-7" aria-hidden="true">→</span></a>
        </div>
        <div className="madras" aria-hidden="true" />
      </header>

      <main id="contenu">
        {earlyAccess && (
          <p role="status" className="bg-pink-bright px-5 py-3 text-center font-bold text-night">
            Accès anticipé activé : 24 h d&apos;avance sur tout le monde.
          </p>
        )}
        {!dbOk && process.env.NODE_ENV !== "production" && (
          <p role="alert" className="bg-sun px-5 py-3 text-center font-bold text-night">
            Mode démo : la base de données n&apos;est pas connectée, l&apos;achat est désactivé (voir le README).
          </p>
        )}

        {/* HERO */}
        <div className="relative isolate overflow-hidden">
          <div className="glow -left-28 top-0 h-[26rem] w-[26rem] [--c:var(--color-pink)]" aria-hidden="true" />
          <div className="glow -right-24 bottom-0 h-[30rem] w-[30rem] [--c:var(--color-blue)]" style={{ animationDelay: "-7s" }} aria-hidden="true" />

          <section aria-labelledby="titre-hero" className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2 md:py-20">
            <div>
              <p className="rise mb-5 inline-block rounded-full border-2 border-ink px-3 py-1 text-sm font-bold uppercase tracking-widest">
                {mode === "closed" ? "Drop 1 terminé" : "Précommande · Drop 1"}
              </p>
              <h1 id="titre-hero">
                <Ransom text="CARIBBEAN REPRESENT" className="text-[clamp(1.4rem,7vw,3.4rem)] md:text-[min(3.6vw,3rem)]" />
              </h1>
              {mode === "closed" && (
                <p className="rise mt-6 max-w-md text-lg text-muted" style={{ "--d": "0.5s" } as React.CSSProperties}>
                  Merci à tous, la préco est terminée. Inscris-toi pour le drop 2.
                </p>
              )}
              {countdown && (
                <div className="rise mt-8" style={{ "--d": "0.6s" } as React.CSSProperties}>
                  <Countdown target={countdown.target} serverNow={now.getTime()} label={countdown.label} />
                </div>
              )}
              <div className="rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ "--d": "0.75s" } as React.CSSProperties}>
                <div className="pulse-wrap flex sm:inline-flex"><a href={cta.href} className="btn btn-primary flex-1 !pr-2.5">{cta.label}<span className="btn-disc" aria-hidden="true">→</span></a></div>
                {mode === "open" && <p className="self-center text-sm text-muted">Jusqu&apos;au {formatDay(closesAt())}</p>}
                {mode === "before" && <p className="self-center text-sm text-muted">Ouverture {opensLabel}</p>}
              </div>
            </div>

            <div className="relative aspect-[6/5] w-full">
              <div className="madras-arch enter-right absolute inset-y-[-4%] left-[20%] right-[20%] border border-white/10" aria-hidden="true" />
              <div className="enter-left absolute left-0 top-0 aspect-[5/4] w-[70%]">
                <div className="float relative h-full w-full">
                  <Image
                    src={drop.designs[0].images.back}
                    alt={drop.designs[0].alt.back}
                    fill
                    priority
                    sizes="(min-width: 768px) 36vw, 66vw"
                    className="tee-shot object-contain"
                  />
                </div>
              </div>
              <div className="enter-right absolute bottom-0 right-0 aspect-[5/4] w-[70%]">
                <div className="float-2 relative h-full w-full">
                  <Image
                    src={drop.designs[1].images.back}
                    alt={drop.designs[1].alt.back}
                    fill
                    sizes="(min-width: 768px) 36vw, 66vw"
                    className="tee-shot object-contain"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* BANDEAU */}
        <div className="marquee madras-bg border-y border-line py-3" aria-hidden="true">
          <div className="marquee-track font-heavy text-lg uppercase tracking-wider sm:text-xl">
            {[0, 1].map((n) => (
              <div key={n} className="flex shrink-0 items-center">
                {MARQUEE.map((t, i) => (
                  <span key={i} className="flex items-center">
                    <span className={i % 2 ? "text-sun" : "text-ink"}>{t}</span>
                    <span className="mx-5 text-pink-bright">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* PIÈCES + PACK + PANIER */}
        <Shop
          designs={designs}
          sizes={[...SIZES]}
          mode={mode}
          opensLabel={`le ${formatDay(opensAt())}`}
          price={{ current: formatEuros(unit.amount), regular: unit.earlyBird ? formatEuros(drop.prices.regular) : null }}
          earlyBirdLeft={earlyBirdLeft}
          pack={{ price: formatEuros(drop.prices.pack), regular: formatEuros(drop.prices.regular * 2) }}
          delivery={{
            pickupLabel: drop.shipping.pickupLabel,
            pickupPrice: drop.shipping.pickupPrice === 0 ? "Gratuit" : formatEuros(drop.shipping.pickupPrice),
            shippingLabel: drop.shipping.metropoleLabel,
            shippingPrice: formatEuros(drop.shipping.metropolePrice),
          }}
          lowStock={drop.lowStockThreshold}
          maxPieces={drop.maxPiecesPerOrder}
          accessToken={earlyAccess ? token : null}
        />

        {/* GUIDE DES TAILLES */}
        <section aria-label="Guide des tailles" className="mx-auto max-w-6xl px-5 pb-16 sm:pb-24">
          <details className="reveal group rounded-3xl border border-line bg-surface p-6 open:border-ink/40">
            <summary className="flex cursor-pointer list-none items-center justify-between font-heavy text-sm uppercase tracking-wide">
              Guide des tailles
              <span aria-hidden="true" className="text-2xl transition-transform duration-300 group-open:rotate-45">+</span>
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[20rem] text-left">
                <caption className="sr-only">Mesures des t-shirts en centimètres</caption>
                <thead>
                  <tr className="border-b border-line"><th className="py-2 pr-4">Taille</th><th className="py-2 pr-4">Largeur poitrine</th><th className="py-2">Longueur</th></tr>
                </thead>
                <tbody>
                  {drop.sizeGuide.map((r) => (
                    <tr key={r.size} className="border-b border-line"><th className="py-2 pr-4">{r.size}</th><td className="py-2 pr-4">{r.chest} cm</td><td className="py-2">{r.length} cm</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-muted">Mesures à plat. [MESURES À CONFIRMER]</p>
            </div>
          </details>
        </section>

        {/* LISTE D'ATTENTE */}
        <section id="liste" aria-labelledby="titre-liste" className="border-t border-line bg-surface px-5 py-16 sm:py-24">
          <div className="reveal mx-auto max-w-xl">
            <h2 id="titre-liste" className="font-heavy text-4xl font-normal uppercase leading-none sm:text-5xl">
              {phase === "closed" ? "Drop 2 : sois prévenu" : "Liste d'attente"}
            </h2>
            <p className="mt-4 mb-8 text-lg text-muted">
              {phase === "closed"
                ? "Sois le premier informé du prochain drop."
                : waitlistOpen
                  ? `Un lien pour précommander ${drop.earlyAccessHours} h avant tout le monde.`
                  : "Sois prévenu des prochains drops."}
            </p>
            <WaitlistForm closed={phase === "closed"} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

const MARQUEE = ["2TIJEN", "Drop 1", "50 pièces par design", "Numérotées", "Caribbean Represent", "Gwada", "Martinik"];
