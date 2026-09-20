import Image from "next/image";
import { drop, SIZES, type Size } from "@/config/drop";
import { Countdown } from "@/components/Countdown";
import { Ransom } from "@/components/Ransom";
import { CartProvider, type CartDesign } from "@/components/CartProvider";
import { CartButton, CartDrawer } from "@/components/CartDrawer";
import { Shop } from "@/components/Shop";
import { SiteFooter } from "@/components/SiteFooter";
import { WaitlistForm } from "@/components/WaitlistForm";
import { canPurchase, getNow, getPhase, isEarlyAccessWindow, opensAt } from "@/lib/drop-state";
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

  const designs: CartDesign[] = drop.designs.map((d) => ({
    id: d.id,
    name: d.name,
    madras: d.madras,
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
    <CartProvider
      canBuy={mode === "open"}
      designs={designs}
      maxPieces={drop.maxPiecesPerOrder}
      accessToken={earlyAccess ? token : null}
      deliveryOptions={{
        pickupLabel: drop.shipping.pickupLabel,
        pickupPrice: drop.shipping.pickupPrice === 0 ? "Gratuit" : formatEuros(drop.shipping.pickupPrice),
        shippingLabel: drop.shipping.metropoleLabel,
        shippingPrice: formatEuros(drop.shipping.metropolePrice),
      }}
    >
      <header className="sticky top-0 z-30 border-b border-line bg-night/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#" className="flex items-center gap-2 font-heavy text-base tracking-wide" aria-label={`${drop.brand}, retour en haut`}>
            <Image src="/logo-2t-white.png" alt="" width={28} height={28} className="h-6 w-auto" />
            {drop.brand}
          </a>
          <div className="flex items-center gap-2">
            <CartButton />
            <a href={cta.href} className="btn btn-ghost !min-h-10 !px-5 !text-[0.65rem]">
              {mode === "open" ? "Précommander" : "Liste d'attente"}
            </a>
          </div>
        </div>
      </header>

      <main id="contenu">
        {earlyAccess && (
          <p role="status" className="bg-pink-bright px-5 py-3 text-center text-sm font-bold text-night">
            Accès anticipé activé : 24 h d&apos;avance sur tout le monde.
          </p>
        )}
        {!dbOk && process.env.NODE_ENV !== "production" && (
          <p role="alert" className="bg-sun px-5 py-3 text-center text-sm font-bold text-night">
            Mode démo : base de données non connectée, achat désactivé (voir le README).
          </p>
        )}

        {/* HERO */}
        <section aria-labelledby="titre-hero" className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-12 md:grid-cols-[1fr_1.15fr] md:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted">
              {mode === "closed" ? "Terminé" : "Précommande"}
            </p>
            <h1 id="titre-hero" className="mt-5">
              <Ransom text="CARIBBEAN REPRESENT" tag="Drop" className="text-[clamp(1.4rem,7vw,3.4rem)] md:text-[min(3.6vw,3rem)]" />
            </h1>
            {mode === "closed" && <p className="mt-6 text-muted">Merci à tous, la préco est terminée.</p>}
            {countdown && (
              <div className="mt-9">
                <Countdown target={countdown.target} serverNow={now.getTime()} label={countdown.label} />
              </div>
            )}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href={cta.href} className="btn btn-primary !pr-2.5">
                {cta.label}
                <span className="btn-disc" aria-hidden="true">→</span>
              </a>
              {mode === "before" && <p className="text-sm text-muted">Ouverture {opensLabel}</p>}
            </div>
          </div>

          <div className="relative aspect-[6/5] w-full">
            {drop.designs.map((d, i) => (
              <a
                key={d.id}
                href="#pieces"
                className={`absolute aspect-[5/4] w-[72%] ${i === 0 ? "left-0 top-0" : "bottom-0 right-0"}`}
              >
                <Image
                  src={d.images.back}
                  alt={d.alt.back}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 768px) 38vw, 72vw"
                  className="tee-shot object-contain"
                />
              </a>
            ))}
          </div>
        </section>

        {/* PIÈCES + PACK + PANIER */}
        <Shop
          sizes={[...SIZES]}
          mode={mode}
          opensLabel={`le ${formatDay(opensAt())}`}
          price={{ current: formatEuros(unit.amount), regular: unit.earlyBird ? formatEuros(drop.prices.regular) : null }}
          earlyBirdLeft={earlyBirdLeft}
          pack={{ price: formatEuros(drop.prices.pack), regular: formatEuros(drop.prices.regular * 2) }}
          lowStock={drop.lowStockThreshold}
        />

        {/* GUIDE DES TAILLES */}
        <section aria-label="Guide des tailles" className="mx-auto max-w-6xl px-5 pb-16">
          <details className="group border-y border-line py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold uppercase tracking-[0.2em]">
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
              <p className="mt-3 text-xs text-muted">Mesures à plat, en cm. [À CONFIRMER]</p>
            </div>
          </details>
        </section>

        {/* LISTE D'ATTENTE */}
        <section id="liste" aria-labelledby="titre-liste" className="border-t border-line bg-surface px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-md">
            <h2 id="titre-liste" className="font-heavy text-2xl uppercase tracking-wide">
              {phase === "closed" ? "Drop 2" : "Liste d'attente"}
            </h2>
            <p className="mt-3 mb-8 text-muted">
              {phase === "closed"
                ? "Sois prévenu du prochain drop."
                : waitlistOpen
                  ? `Un lien d'accès ${drop.earlyAccessHours} h avant tout le monde.`
                  : "Sois prévenu des prochains drops."}
            </p>
            <WaitlistForm closed={phase === "closed"} />
          </div>
        </section>
      </main>

      <SiteFooter />
      <CartDrawer />
    </CartProvider>
  );
}
