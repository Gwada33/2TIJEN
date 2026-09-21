"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BuyBox } from "@/components/BuyBox";
import { useCart, type CartDesign, type Size } from "@/components/CartProvider";

/**
 * Boutique (côté navigateur). Ce composant n'affiche que des données fournies par le
 * serveur : il ne calcule JAMAIS un prix ni un stock. Le panier vit dans <CartProvider>.
 */

export type ShopProps = {
  sizes: Size[];
  mode: "open" | "before" | "closed";
  /** Prix d'une pièce affiché (calculé par le serveur). */
  price: string;
  pack: { price: string; regular: string };
  lowStock: number;
};

export function Shop(props: ShopProps) {
  const { sizes, mode, lowStock } = props;
  const { designs, canBuy, add } = useCart();
  const [selected, setSelected] = useState<Record<string, Size | null>>({});
  const bothSelected = designs.every((d) => selected[d.id]);
  const [packHint, setPackHint] = useState(false);

  return (
    <section id="pieces" aria-labelledby="titre-pieces" className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
      <h2 id="titre-pieces" className="font-heavy text-2xl uppercase tracking-wide sm:text-3xl">Les pièces</h2>

      <div className="mt-10 grid gap-16 md:grid-cols-2 md:gap-14">
        {designs.map((d) => (
          <ProductCard
            key={d.id}
            design={d}
            sizes={sizes}
            mode={mode}
            price={props.price}
            lowStock={lowStock}
            selected={selected[d.id] ?? null}
            onSelect={(size) => setSelected((s) => ({ ...s, [d.id]: size }))}
          />
        ))}
      </div>

      {/* Pack (seulement quand la vente est ouverte) */}
      {canBuy && (
        <div className="mt-12 flex flex-col gap-5 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-heavy text-base uppercase tracking-wide">Pack 2 pièces</h3>
            <p className="mt-1">
              <span className="font-heavy text-2xl">{props.pack.price}</span>{" "}
              <span className="text-muted line-through">{props.pack.regular}</span>
            </p>
          </div>
          <div className="w-full sm:w-80">
            <button
              type="button"
              className="btn btn-primary w-full !pr-2.5"
              onClick={() => {
                if (!bothSelected) return setPackHint(true); // on explique au lieu de griser le bouton
                setPackHint(false);
                add(designs.map((d) => ({ designId: d.id, size: selected[d.id]! })));
              }}
            >
              Ajouter le pack
              <span className="btn-disc" aria-hidden="true">+</span>
            </button>
            {packHint && !bothSelected && <p role="alert" className="mt-2 text-sm font-bold text-orange">Choisis une taille pour chaque pièce.</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function ProductCard(props: {
  design: CartDesign;
  sizes: Size[];
  mode: ShopProps["mode"];
  price: string;
  lowStock: number;
  selected: Size | null;
  onSelect: (size: Size) => void;
}) {
  const { design: d } = props;
  // Souris : le t-shirt se retourne au survol. Écran tactile / clavier : bouton ↻.
  const [flipped, setFlipped] = useState(false);
  const href = `/pieces/${d.id}`;

  return (
    <article className="flex flex-col" aria-labelledby={`p-${d.id}`}>
      <div className="relative">
        <Link
          href={href}
          aria-label={`${d.name} : voir la pièce`}
          className="relative block aspect-[5/4] w-full overflow-hidden"
          style={{
            // fond de studio : centre éclairé, bords un peu plus sombres
            background: `radial-gradient(ellipse 75% 70% at 50% 42%, color-mix(in srgb, ${d.backdrop}, white 45%), ${d.backdrop} 65%, color-mix(in srgb, ${d.backdrop}, black 9%))`,
          }}
          onPointerEnter={(e) => { if (e.pointerType === "mouse") setFlipped(true); }}
          onPointerLeave={(e) => { if (e.pointerType === "mouse") setFlipped(false); }}
        >
          <span className="flip-stage absolute inset-0 block scale-[0.94]">
            <span className="flip-card block" data-flipped={flipped}>
              <span className="flip-face">
                <Image src={d.images.back} alt={flipped ? "" : d.alt.back} fill sizes="(min-width: 768px) 46vw, 92vw" className="object-contain" />
              </span>
              <span className="flip-face flip-face-back">
                <Image src={d.images.front} alt={flipped ? d.alt.front : ""} fill sizes="(min-width: 768px) 46vw, 92vw" className="object-contain" />
              </span>
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-pressed={flipped}
          aria-label={`${d.name} : voir ${flipped ? "le motif" : "l'autre côté"}`}
          onClick={() => setFlipped((f) => !f)}
          className="absolute bottom-2 right-0 grid h-11 w-11 place-items-center bg-night/70 text-base backdrop-blur"
        >
          <span aria-hidden="true">↻</span>
        </button>
      </div>
      {/* filet madras aux couleurs du design */}
      <div className="madras-chip mt-2 h-1.5" style={{ "--madras-img": `url(${d.madras})` } as React.CSSProperties} aria-hidden="true" />

      <div className="flex items-baseline justify-between gap-4 pt-6">
        <h3 id={`p-${d.id}`} className="font-heavy text-sm uppercase leading-snug tracking-wide sm:text-base">
          <Link href={href} className="hover:text-sun">{d.name}</Link>
        </h3>
        <p className="shrink-0 font-heavy text-xl leading-none">{props.price}</p>
      </div>

      <div className="mt-7">
        <BuyBox design={d} sizes={props.sizes} mode={props.mode} price={props.price} lowStock={props.lowStock} selected={props.selected} onSelect={props.onSelect} />
      </div>
    </article>
  );
}
