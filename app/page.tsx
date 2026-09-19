import Image from "next/image";
import { drop, SIZES, type Size } from "@/config/drop";
import { Countdown } from "@/components/Countdown";
import { Ransom } from "@/components/Ransom";
import { Shop, type ShopDesign } from "@/components/Shop";
import { SiteFooter } from "@/components/SiteFooter";
import { WaitlistForm } from "@/components/WaitlistForm";
import { canPurchase, closesAt, getNow, getPhase, isEarlyAccessWindow, opensAt } from "@/lib/drop-state";
import { estimatedDelivery, formatDateTime, formatDay, formatEuros } from "@/lib/format";
import { currentUnitPrice } from "@/lib/pricing";
import { getStock, piecesTaken, type StockMap } from "@/lib/stock";
import { isValidAccessToken } from "@/lib/waitlist";

/** Stock initial de la config, utilisé seulement si la base n'est pas joignable. */
function fallbackStock(): StockMap {
  return Object.fromEntries(
    drop.designs.map((d) => [
      d.id,
      Object.fromEntries(SIZES.map((s) => [s, { total: d.stock[s], sold: 0, reserved: 0, available: d.stock[s] }])),
    ]),
  ) as StockMap;
}

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
    tagline: d.tagline,
    description: d.description,
    accent: d.accent,
    images: d.images,
    alt: d.alt,
    available: Object.fromEntries(SIZES.map((s) => [s, stock[d.id]?.[s]?.available ?? 0])) as Record<Size, number>,
  }));

  const { from, to } = estimatedDelivery();
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
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#" className="flex items-center gap-2 font-black text-xl tracking-wide" aria-label={`${drop.brand}, retour en haut`}>
            <Image src="/logo-2t-black.png" alt="" width={28} height={28} className="h-7 w-auto" />
            {drop.brand}
          </a>
          <a href={cta.href} className="btn btn-primary !min-h-11 !px-5 text-sm">{mode === "open" ? "Précommander" : "Liste d'attente"}</a>
        </div>
      </header>

      <main id="contenu">
        {earlyAccess && (
          <p role="status" className="bg-pink-soft px-5 py-3 text-center font-bold text-ink">
            Accès anticipé activé : tu as 24 h d&apos;avance sur tout le monde.
          </p>
        )}
        {!dbOk && process.env.NODE_ENV !== "production" && (
          <p role="alert" className="bg-yellow px-5 py-3 text-center font-bold text-ink">
            Mode démo : la base de données n&apos;est pas connectée, l&apos;achat est désactivé (voir le README).
          </p>
        )}

        {/* HERO */}
        <section aria-labelledby="titre-hero" className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-4 inline-block rounded-full border-2 border-ink px-3 py-1 text-sm font-bold uppercase tracking-widest">
              {mode === "closed" ? "Drop 1 terminé" : "Précommande · Drop 1"}
            </p>
            <h1 id="titre-hero" className="text-4xl sm:text-6xl">
              <Ransom text="GUADELOUPEAN REPRESENT" className="text-[clamp(1.35rem,6.2vw,3.2rem)] md:text-[min(3.1vw,2.3rem)]" />
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted">
              {mode === "closed"
                ? "Merci à tous : la préco du drop 1 est terminée. Les pièces sont en fabrication. Inscris-toi pour ne pas rater le drop 2."
                : "Deux t-shirts oversize, 50 pièces par design, chacune numérotée. Fait en Guadeloupe, pour la Guadeloupe et la diaspora."}
            </p>
            {countdown && (
              <div className="mt-8">
                <Countdown target={countdown.target} serverNow={now.getTime()} label={countdown.label} />
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={cta.href} className="btn btn-primary text-lg">{cta.label}</a>
              {mode === "open" && (
                <p className="self-center text-sm text-muted">
                  Jusqu&apos;au {formatDay(closesAt())} · livraison {drop.deliveryDelay}
                </p>
              )}
              {mode === "before" && <p className="self-center text-sm text-muted">Ouverture {opensLabel}</p>}
            </div>
          </div>
          <div className="relative aspect-[6/5] w-full" aria-hidden="false">
            <div className="absolute left-0 top-0 aspect-[5/4] w-[70%]">
              <Image
                src={drop.designs[0].images.back}
                alt={drop.designs[0].alt.back}
                fill
                priority
                sizes="(min-width: 768px) 36vw, 66vw"
                className="object-contain"
              />
            </div>
            <div className="absolute bottom-0 right-0 aspect-[5/4] w-[70%]">
              <Image
                src={drop.designs[1].images.back}
                alt={drop.designs[1].alt.back}
                fill
                sizes="(min-width: 768px) 36vw, 66vw"
                className="object-contain"
              />
            </div>
          </div>
        </section>

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

        {/* HISTOIRE DU NOM */}
        <section aria-labelledby="titre-histoire" className="bg-cream px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <h2 id="titre-histoire" className="font-black text-4xl uppercase leading-none sm:text-6xl">Pourquoi 2TIJEN ?</h2>
            <p className="mt-6 text-lg leading-relaxed">
              <mark className="bg-yellow/60 px-1">[TEXTE À FOURNIR]</mark> L&apos;histoire du nom 2TIJEN, son origine et ce qu&apos;il représente.
            </p>
          </div>
        </section>

        {/* RÉASSURANCE */}
        <section aria-labelledby="titre-infos" className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <h2 id="titre-infos" className="font-black text-4xl uppercase leading-none sm:text-6xl">Bon à savoir</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card title="Précommande">
              Ton t-shirt est fabriqué après la clôture, à partir de {drop.production.minOrders} commandes. Si le minimum n&apos;est pas atteint, tu es remboursé.
            </Card>
            <Card title="Livraison estimée">
              Entre le {formatDay(from)} et le {formatDay(to, true)} ({drop.deliveryDelay}).
              {" "}Remise en main propre en Guadeloupe ou envoi en métropole.
            </Card>
            <Card title="Paiement sécurisé">
              Paiement par carte, Apple Pay ou Google Pay, via Stripe. Nous ne voyons jamais ta carte.
            </Card>
            <Card title="Pièces numérotées">
              Chaque t-shirt reçoit son numéro (ex. 012/050), noté sur ta commande.
            </Card>
            <Card title="Une question ?">
              <a className="font-bold underline" href={`https://wa.me/${drop.contact.whatsapp}`}>WhatsApp</a>
              {" · "}
              <a className="font-bold underline" href={drop.contact.instagram}>Instagram</a>
              {" · "}
              <a className="font-bold underline" href={`mailto:${drop.contact.email}`}>E-mail</a>
            </Card>
            <Card title="Conditions">
              <a className="font-bold underline" href="/cgv">CGV</a> · <a className="font-bold underline" href="/retours">Retours et échanges</a>
            </Card>
          </ul>

          <details className="mt-8 rounded-3xl border-2 border-ink p-6">
            <summary className="cursor-pointer text-lg font-bold">Guide des tailles</summary>
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
              <p className="mt-3 text-sm text-muted">Mesures à plat, coupe oversize. [MESURES À CONFIRMER]</p>
            </div>
          </details>
        </section>

        {/* LISTE D'ATTENTE */}
        <section id="liste" aria-labelledby="titre-liste" className="bg-pink-soft px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-xl">
            <h2 id="titre-liste" className="font-black text-4xl uppercase leading-none sm:text-5xl">
              {phase === "closed" ? "Drop 2 : sois prévenu" : "Liste d'attente"}
            </h2>
            <p className="mt-4 mb-8 text-lg">
              {phase === "closed"
                ? "Laisse ton e-mail pour être le premier informé du prochain drop."
                : waitlistOpen
                  ? `Les inscrits reçoivent un lien pour précommander ${drop.earlyAccessHours} h avant tout le monde.`
                  : "La préco est ouverte. Inscris-toi pour être prévenu des prochains drops."}
            </p>
            <WaitlistForm closed={phase === "closed"} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-3xl border border-line bg-white p-6">
      <h3 className="text-xl font-black">{title}</h3>
      <p className="mt-2 leading-relaxed text-muted">{children}</p>
    </li>
  );
}
