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
      {/* HERO : sur mobile, l'ordre est titre → pièces → compte à rebours et bouton */}
      <section aria-labelledby="titre-hero" className="mx-auto grid max-w-6xl gap-x-12 gap-y-10 px-5 py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:py-20">
        <div className="md:self-end">
          <h1 id="titre-hero">
            <Ransom text="CARIBBEAN REPRESENT" tag="Drop" className="text-[clamp(1.4rem,8vw,3.4rem)] md:text-[min(3.6vw,3rem)]" />
          </h1>
        </div>

        <div className="flex items-center justify-center md:col-start-2 md:row-span-2 md:row-start-1">
          {drop.designs.map((d, i) => (
            <Link key={d.id} href={`/pieces/${d.id}`} className={`relative aspect-[5/4] w-[54%] shrink-0 ${i === 0 ? "" : "-ml-[8%]"}`}>
              <Image src={d.images.back} alt={d.alt.back} fill preload={i === 0} fetchPriority={i === 0 ? "high" : undefined} sizes="(min-width: 768px) 28vw, 54vw" className="object-contain" />
            </Link>
          ))}
        </div>

        <div className="md:self-start">
          {countdown && <Countdown target={countdown.target} serverNow={now.getTime()} label={countdown.label} />}
          <a href={cta.href} className={`btn btn-primary !pr-2.5 ${countdown ? "mt-9" : ""}`}>
            {cta.label}
            <span className="btn-disc" aria-hidden="true">→</span>
          </a>
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
