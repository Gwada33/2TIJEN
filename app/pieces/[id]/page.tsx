import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { drop, getDesign, SIZES } from "@/config/drop";
import { ProductBuy } from "@/components/BuyBox";
import { PhotoTile } from "@/components/PhotoTile";
import { SizeGuide } from "@/components/SizeGuide";
import { StoreShell } from "@/components/StoreShell";
import { formatEuros } from "@/lib/format";
import { loadStorefront } from "@/lib/storefront";

export async function generateMetadata({ params }: PageProps<"/pieces/[id]">): Promise<Metadata> {
  const design = getDesign((await params).id);
  return design ? { title: design.name, openGraph: { images: [design.images.back] } } : {};
}

/** Page d'une pièce : photos du t-shirt (face, dos, porté), taille et ajout au panier. */
export default async function PiecePage({ params, searchParams }: PageProps<"/pieces/[id]">) {
  const { id } = await params;
  const design = getDesign(id);
  if (!design) notFound();

  const store = await loadStorefront(await searchParams);
  const cartDesign = store.designs.find((d) => d.id === design.id)!;
  // Photos portées de CETTE pièce ; sans photo fournie, deux tuiles provisoires.
  const worn = design.photos.length ? design.photos : [undefined, undefined];

  return (
    <StoreShell store={store}>
      <article className="mx-auto grid max-w-6xl gap-10 px-5 py-8 md:grid-cols-[1.5fr_1fr] md:gap-16 md:py-14" aria-labelledby="titre-piece">
        {/* Photos : défilement horizontal sur mobile, grille sur ordinateur */}
        <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0" aria-label={`Photos, ${design.name}`}>
          {[
            { src: design.images.back, alt: design.alt.back },
            { src: design.images.front, alt: design.alt.front },
          ].map((v) => (
            <div key={v.src} className="relative aspect-[4/5] w-[86%] shrink-0 snap-center bg-surface md:w-auto">
              <Image src={v.src} alt={v.alt} fill priority sizes="(min-width: 768px) 30vw, 86vw" className="tee-shot object-contain p-2" />
            </div>
          ))}
          {worn.map((photo, i) => (
            <div key={photo?.src ?? i} className="w-[86%] shrink-0 snap-center md:w-auto">
              <PhotoTile photo={photo} madras={design.madras} />
            </div>
          ))}
        </div>

        {/* Achat : reste visible à l'écran sur ordinateur */}
        <div className="md:sticky md:top-24 md:self-start">
          <Link href="/#pieces" className="text-xs text-muted underline underline-offset-4 hover:text-ink">← Les pièces</Link>
          <div className="madras-chip mt-6 h-1.5 w-16" style={{ "--madras-img": `url(${design.madras})` } as React.CSSProperties} aria-hidden="true" />
          <h1 id="titre-piece" className="mt-4 font-heavy text-xl uppercase leading-snug tracking-wide sm:text-2xl">{design.name}</h1>
          <p className="mt-3 font-heavy text-3xl">{formatEuros(store.unit.amount)}</p>
          <div className="mt-8">
            <ProductBuy design={cartDesign} sizes={[...SIZES]} mode={store.mode} price={formatEuros(store.unit.amount)} lowStock={drop.lowStockThreshold} />
          </div>
        </div>
      </article>
      <SizeGuide />
    </StoreShell>
  );
}
