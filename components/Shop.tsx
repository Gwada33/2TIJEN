"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useCart, type CartDesign, type Size } from "@/components/CartProvider";

/**
 * Boutique (côté navigateur). Ce composant n'affiche que des données fournies par le
 * serveur : il ne calcule JAMAIS un prix ni un stock. Le panier vit dans <CartProvider>.
 */

export type ShopProps = {
  sizes: Size[];
  mode: "open" | "before" | "closed";
  opensLabel: string;
  /** Prix d'une pièce affiché (calculé par le serveur). */
  price: { current: string; regular: string | null };
  earlyBirdLeft: number | null;
  pack: { price: string; regular: string };
  lowStock: number;
};

export function Shop(props: ShopProps) {
  const { sizes, mode, lowStock } = props;
  const { designs, canBuy, add, inCart } = useCart();
  const [selected, setSelected] = useState<Record<string, Size | null>>({});
  const bothSelected = designs.every((d) => selected[d.id]);

  return (
    <section id="pieces" aria-labelledby="titre-pieces" className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
      <h2 id="titre-pieces" className="font-heavy text-2xl uppercase tracking-wide sm:text-3xl">Les pièces</h2>

      <div className="mt-8 grid gap-12 md:grid-cols-2 md:gap-8">
        {designs.map((d) => (
          <ProductCard
            key={d.id}
            design={d}
            sizes={sizes}
            mode={mode}
            opensLabel={props.opensLabel}
            price={props.price}
            earlyBirdLeft={props.earlyBirdLeft}
            lowStock={lowStock}
            selected={selected[d.id] ?? null}
            inCart={(size) => inCart(d.id, size)}
            onSelect={(size) => setSelected((s) => ({ ...s, [d.id]: size }))}
            onAdd={(size) => add([{ designId: d.id, size }])}
          />
        ))}
      </div>

      {/* Pack */}
      <div className="mt-12 flex flex-col gap-5 border-y border-line py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heavy text-base uppercase tracking-wide">Pack 2 pièces</h3>
          <p className="mt-1">
            <span className="font-heavy text-2xl">{props.pack.price}</span>{" "}
            <span className="text-muted line-through">{props.pack.regular}</span>
          </p>
        </div>
        {canBuy ? (
          <button
            type="button"
            className="btn btn-primary w-full !pr-2.5 sm:w-80"
            disabled={!bothSelected}
            onClick={() => add(designs.map((d) => ({ designId: d.id, size: selected[d.id]! })))}
          >
            {bothSelected ? "Ajouter le pack" : "Une taille par design"}
            <span className="btn-disc" aria-hidden="true">+</span>
          </button>
        ) : (
          <p className="text-sm font-bold uppercase tracking-wide text-muted">{mode === "before" ? `Ouverture ${props.opensLabel}` : "Préco terminée"}</p>
        )}
      </div>
    </section>
  );
}

function ProductCard(props: {
  design: CartDesign;
  sizes: Size[];
  mode: ShopProps["mode"];
  opensLabel: string;
  price: ShopProps["price"];
  earlyBirdLeft: number | null;
  lowStock: number;
  selected: Size | null;
  inCart: (size: Size) => number;
  onSelect: (size: Size) => void;
  onAdd: (size: Size) => void;
}) {
  const { design: d, sizes, mode, lowStock, selected } = props;
  // Le t-shirt se retourne : au survol avec une souris, au toucher (ou au clavier) sur mobile.
  const [flipped, setFlipped] = useState(false);
  const pointer = useRef<string>("key");
  const canBuy = mode === "open";
  const remaining = selected ? d.available[selected] : null;
  const allSoldOut = useMemo(() => sizes.every((s) => d.available[s] === 0), [sizes, d.available]);

  return (
    <article className="flex flex-col" aria-labelledby={`p-${d.id}`}>
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={`${d.name} : voir ${flipped ? "le motif" : "l'autre côté"} du t-shirt`}
        className="card-tee relative block aspect-[5/4] w-full cursor-pointer text-left"
        onPointerDown={(e) => { pointer.current = e.pointerType; }}
        onKeyDown={() => { pointer.current = "key"; }}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") setFlipped(true); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setFlipped(false); }}
        onClick={() => { if (pointer.current !== "mouse") setFlipped((f) => !f); }}
      >
        <span className="flip-stage absolute inset-0 block">
          <span className="flip-card block" data-flipped={flipped}>
            <span className="flip-face">
              <Image
                src={d.images.back}
                alt={flipped ? "" : d.alt.back}
                fill
                sizes="(min-width: 768px) 46vw, 92vw"
                className="tee-shot object-contain"
              />
            </span>
            <span className="flip-face flip-face-back">
              <Image
                src={d.images.front}
                alt={flipped ? d.alt.front : ""}
                fill
                sizes="(min-width: 768px) 46vw, 92vw"
                className="tee-shot object-contain"
              />
            </span>
          </span>
        </span>
        <span className="absolute left-0 top-0 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/80" aria-hidden="true">
          50 pièces
        </span>
        <span className="absolute bottom-1 right-0 grid h-10 w-10 place-items-center rounded-full border border-line bg-night/70 text-lg backdrop-blur" aria-hidden="true">
          ↻
        </span>
      </button>

      <span
        className="madras-chip mt-3 block h-2 w-20 rounded-full"
        style={{ "--madras-img": `url(${d.madras})` } as React.CSSProperties}
        aria-hidden="true"
      />
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <h3 id={`p-${d.id}`} className="font-heavy text-sm uppercase tracking-wide sm:text-base">{d.name}</h3>
        <p className="shrink-0 text-right">
          {props.price.regular && <span className="mr-2 text-sm text-muted line-through">{props.price.regular}</span>}
          <span className="font-heavy text-lg">{props.price.current}</span>
        </p>
      </div>
      {props.price.regular && props.earlyBirdLeft !== null && canBuy && (
        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-pink-bright">
          Early bird · plus que {props.earlyBirdLeft}
        </p>
      )}

      <div className="mt-4" role="group" aria-label={`Choisir une taille, ${d.name}`}>
        <div className="grid grid-cols-4 gap-2">
          {sizes.map((s) => {
            const left = d.available[s];
            const soldOut = canBuy && left === 0;
            const active = selected === s;
            return (
              <button
                key={s}
                type="button"
                disabled={!canBuy || soldOut}
                aria-pressed={active}
                aria-label={soldOut ? `Taille ${s}, épuisé` : canBuy && left <= lowStock ? `Taille ${s}, plus que ${left}` : `Taille ${s}`}
                onClick={() => props.onSelect(s)}
                className={`min-h-14 rounded-full border px-1 py-2 text-center font-heavy transition-colors ${
                  active ? "border-ink bg-ink text-night" : "border-line bg-surface hover:border-ink"
                } disabled:cursor-not-allowed disabled:bg-night disabled:text-muted`}
              >
                <span className={`block text-sm ${soldOut ? "line-through" : ""}`}>{s}</span>
                {canBuy && (
                  <span className="block text-[0.7rem] font-bold leading-tight">
                    {soldOut ? "Épuisé" : left <= lowStock ? `Plus que ${left}` : " "}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {canBuy && allSoldOut && <p className="mt-2 text-sm font-bold text-pink-bright" role="status">Ce design est épuisé.</p>}
      </div>

      {canBuy ? (
        <button
          type="button"
          className="btn btn-primary mt-2 w-full !pr-2.5"
          disabled={!selected || (remaining ?? 0) <= props.inCart(selected)}
          onClick={() => selected && props.onAdd(selected)}
        >
          {selected ? "Ajouter au panier" : "Choisis ta taille"}
          <span className="btn-disc" aria-hidden="true">+</span>
        </button>
      ) : (
        <p className="btn btn-ghost mt-2 w-full" aria-disabled="true">
          {mode === "before" ? `Ouverture ${props.opensLabel}` : "Préco terminée"}
        </p>
      )}
    </article>
  );
}
