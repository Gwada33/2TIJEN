import Image from "next/image";
import Link from "next/link";
import { drop, SIZES } from "@/config/drop";
import { Countdown } from "@/components/Countdown";
import { Gallery } from "@/components/Gallery";
import { Ransom } from "@/components/Ransom";
import { Shop } from "@/components/Shop";
import { SizeGuide } from "@/components/SizeGuide";
import { StoreShell } from "@/components/StoreShell";
import { WaitlistForm } from "@/components/WaitlistForm";
import { formatDateTime, formatEuros } from "@/lib/format";
import { opensAt } from "@/lib/drop-state";
import { loadStorefront } from "@/lib/storefront";

export default async function Home({ searchParams }: PageProps<"/">) {
  const store = await loadStorefront(await searchParams);
  const { now, phase, mode, unit } = store;

  const cta =
    mode === "open"
      ? { href: "#pieces", label: "Je précommande" }
      : { href: "#liste", label: phase === "closed" ? "Drop 2" : "Me prévenir" };

  const countdown =
    phase === "closed"
      ? null
      : phase === "open"
        ? { target: drop.closesAt, label: "Clôture dans" }
        : { target: drop.opensAt, label: `Ouverture · ${formatDateTime(opensAt())}` };

  return (
    <StoreShell store={store} home>
      {/* HERO */}
      <section aria-labelledby="titre-hero" className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-12 md:grid-cols-[1fr_1.15fr] md:py-20">
        <div>
          <h1 id="titre-hero">
            <Ransom text="CARIBBEAN REPRESENT" tag="Drop" className="text-[clamp(1.4rem,7vw,3.4rem)] md:text-[min(3.6vw,3rem)]" />
          </h1>
          {countdown && (
            <div className="mt-9">
              <Countdown target={countdown.target} serverNow={now.getTime()} label={countdown.label} />
            </div>
          )}
          <a href={cta.href} className="btn btn-primary mt-9 !pr-2.5">
            {cta.label}
            <span className="btn-disc" aria-hidden="true">→</span>
          </a>
        </div>

        <div className="relative aspect-[6/5] w-full">
          {drop.designs.map((d, i) => (
            <Link key={d.id} href={`/pieces/${d.id}`} className={`absolute aspect-[5/4] w-[72%] ${i === 0 ? "left-0 top-0" : "bottom-0 right-0"}`}>
              <Image src={d.images.back} alt={d.alt.back} fill priority={i === 0} sizes="(min-width: 768px) 38vw, 72vw" className="tee-shot object-contain" />
            </Link>
          ))}
        </div>
      </section>

      <Shop
        sizes={[...SIZES]}
        mode={mode}
        price={formatEuros(unit.amount)}
        pack={{ price: formatEuros(drop.prices.pack), regular: formatEuros(drop.prices.regular * 2) }}
        lowStock={drop.lowStockThreshold}
      />

      <Gallery />
      <SizeGuide />

      {/* LISTE D'ATTENTE */}
      <section id="liste" aria-labelledby="titre-liste" className="border-t border-line bg-surface px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-md">
          <h2 id="titre-liste" className="mb-8 font-heavy text-2xl uppercase tracking-wide">
            {phase === "closed" ? "Drop 2" : "Liste d'attente"}
          </h2>
          <WaitlistForm closed={phase === "closed"} />
        </div>
      </section>
    </StoreShell>
  );
}
