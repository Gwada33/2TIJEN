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
  price: string;
  pack: { price: string; regular: string };
  lowStock: number;
  /** Fenêtre de livraison estimée, ex. « 18 nov. – 2 déc. 2026 ». */
  deliveryEstimate: string;
};

export function Shop(props: ShopProps) {
  const { sizes, mode, lowStock } = props;
  const { designs, canBuy, add, inCart } = useCart();
  const [selected, setSelected] = useState<Record<string, Size | null>>({});
  const bothSelected = designs.every((d) => selected[d.id]);

  return (
    <section id="pieces" aria-labelledby="titre-pieces" className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
      <h2 id="titre-pieces" className="font-heavy text-2xl uppercase tracking-wide sm:text-3xl">Les pièces</h2>

      <div className="mt-10 grid gap-16 md:grid-cols-2 md:gap-14">
        {designs.map((d, i) => (
          <ProductCard
            key={d.id}
            index={i + 1}
            design={d}
            sizes={sizes}
            mode={mode}
            opensLabel={props.opensLabel}
            price={props.price}
            lowStock={lowStock}
            deliveryEstimate={props.deliveryEstimate}
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
  index: number;
  sizes: Size[];
  mode: ShopProps["mode"];
  opensLabel: string;
  price: string;
  deliveryEstimate: string;
  lowStock: number;
  selected: Size | null;
  inCart: (size: Size) => number;
  onSelect: (size: Size) => void;
  onAdd: (size: Size) => void;
}) {
  const { design: d, sizes, mode, lowStock, selected } = props;
  // Le t-shirt se retourne : au survol avec une souris, au toucher (ou au clavier) sur mobile.
  const [flipped, setFlipped] = useState(false);
  const [needSize, setNeedSize] = useState(false);
  const pointer = useRef<string>("key");
  const canBuy = mode === "open";
  const remaining = selected ? d.available[selected] : null;
  const inCartNow = selected ? props.inCart(selected) : 0;
  const maxedOut = selected !== null && (remaining ?? 0) <= inCartNow;
  const allSoldOut = useMemo(() => sizes.every((s) => d.available[s] === 0), [sizes, d.available]);
  const sold = d.stock.total - d.stock.left;
  const soldPercent = d.stock.total ? Math.max(Math.round((sold / d.stock.total) * 100), 3) : 0;
  const madras = { "--madras-img": `url(${d.madras})` } as React.CSSProperties;

  const openGuide = () => document.getElementById("tailles")?.setAttribute("open", "");
  const onCta = () => {
    if (!selected) {
      setNeedSize(true); // pas de bouton grisé : on montre où cliquer
      return;
    }
    props.onAdd(selected);
  };

  return (
    <article className="flex flex-col" aria-labelledby={`p-${d.id}`}>
      {/* Bandeau : numéro du design + état du stock */}
      <div className="flex items-center justify-between pb-4 text-[0.65rem] font-bold uppercase tracking-[0.2em]">
        <span className="font-heavy text-muted">N°{String(props.index).padStart(2, "0")}</span>
        {canBuy && sold > 0 && !allSoldOut ? (
          <span className="text-pink-bright">{d.stock.left} restante{d.stock.left > 1 ? "s" : ""} sur {d.stock.total}</span>
        ) : (
          <span className="text-muted">Édition limitée · {d.stock.total} pièces</span>
        )}
      </div>

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
        <span className="flip-stage absolute inset-0 block scale-[1.12]">
          <span className="flip-card block" data-flipped={flipped}>
            <span className="flip-face">
              <Image src={d.images.back} alt={flipped ? "" : d.alt.back} fill sizes="(min-width: 768px) 46vw, 92vw" className="tee-shot object-contain" />
            </span>
            <span className="flip-face flip-face-back">
              <Image src={d.images.front} alt={flipped ? d.alt.front : ""} fill sizes="(min-width: 768px) 46vw, 92vw" className="tee-shot object-contain" />
            </span>
          </span>
        </span>
        {/* deux traits = deux vues (face / dos) */}
        <span className="absolute bottom-3 left-0 flex gap-1.5" aria-hidden="true">
          <span className={`h-0.5 transition-all ${flipped ? "w-2 bg-line" : "w-6 bg-ink"}`} />
          <span className={`h-0.5 transition-all ${flipped ? "w-6 bg-ink" : "w-2 bg-line"}`} />
        </span>
        <span className="absolute bottom-2 right-0 grid h-9 w-9 place-items-center border border-line bg-night/70 text-base backdrop-blur" aria-hidden="true">↻</span>
      </button>
      {/* filet madras aux couleurs du design */}
      <div className="madras-chip mt-2 h-1.5" style={madras} aria-hidden="true" />

      <div className="flex flex-1 flex-col pt-7">
        <div className="flex items-start justify-between gap-4">
          <h3 id={`p-${d.id}`} className="font-heavy text-sm uppercase leading-snug tracking-wide sm:text-base">{d.name}</h3>
          <p className="shrink-0 font-heavy text-2xl leading-none">{props.price}</p>
        </div>

        {/* Rareté réelle : barre des pièces vendues (données du serveur) */}
        {canBuy && sold > 0 && !allSoldOut && (
          <div className="mt-5 h-1 bg-line" role="presentation">
            <div className="madras-chip h-full" style={{ width: `${soldPercent}%`, ...madras }} />
          </div>
        )}

        <div className="flex-1" />

        <div className={`mt-8 ${needSize ? "shake outline outline-1 outline-offset-4 outline-orange" : ""}`} role="group" aria-label={`Choisir une taille, ${d.name}`}>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">Taille</span>
            <a href="#tailles" onClick={openGuide} className="text-xs text-muted underline underline-offset-4 hover:text-ink">Guide des tailles</a>
          </div>
          <div className="grid grid-cols-4 divide-x divide-line border border-line">
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
                  onClick={() => {
                    props.onSelect(s);
                    setNeedSize(false);
                  }}
                  className={`min-h-14 px-1 py-2 text-center font-heavy transition-colors ${
                    active ? "bg-ink text-night" : "hover:bg-surface-2"
                  } disabled:cursor-not-allowed disabled:bg-night disabled:text-muted`}
                >
                  <span className={`block text-sm ${soldOut ? "line-through" : ""}`}>{s}</span>
                  {canBuy && (
                    <span className={`block text-[0.6rem] font-bold leading-tight ${active ? "text-night" : "text-pink-bright"}`}>
                      {soldOut ? "Épuisé" : left <= lowStock ? `Plus que ${left}` : " "}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {needSize && <p role="alert" className="mt-2 text-sm font-bold text-orange">Choisis une taille pour continuer.</p>}
          {canBuy && allSoldOut && <p role="status" className="mt-2 text-sm font-bold text-pink-bright">Ce design est épuisé.</p>}
        </div>

        {canBuy ? (
          <>
            <button type="button" className="btn btn-primary btn-square mt-5 w-full !pr-2.5" disabled={allSoldOut || maxedOut} onClick={onCta}>
              {maxedOut ? "Stock maximum dans ton panier" : `Ajouter au panier · ${props.price}`}
              {!maxedOut && <span className="btn-disc" aria-hidden="true">+</span>}
            </button>
            <p className="mt-4 text-center text-xs text-muted">
              {inCartNow > 0 ? `Déjà ${inCartNow} dans ton panier · ` : ""}Livraison estimée {props.deliveryEstimate}
            </p>
          </>
        ) : (
          <a href="#liste" className="btn btn-primary btn-square mt-4 w-full !pr-2.5">
            {mode === "before" ? `Me prévenir · ouverture ${props.opensLabel}` : "Me prévenir du prochain drop"}
            <span className="btn-disc" aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </article>
  );
}
