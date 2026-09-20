"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart, type CartDesign, type Size } from "@/components/CartProvider";

/** Choix de la taille + bouton d'ajout au panier. Utilisé sur les cartes de l'accueil et sur les pages produit. */
export function BuyBox(props: {
  design: CartDesign;
  sizes: Size[];
  mode: "open" | "before" | "closed";
  price: string;
  lowStock: number;
  selected: Size | null;
  onSelect: (size: Size) => void;
}) {
  const { design: d, sizes, mode, lowStock, selected } = props;
  const { add, inCart } = useCart();
  const [needSize, setNeedSize] = useState(false);
  const canBuy = mode === "open";
  const remaining = selected ? d.available[selected] : null;
  const maxedOut = selected !== null && (remaining ?? 0) <= inCart(d.id, selected);
  const allSoldOut = useMemo(() => sizes.every((s) => d.available[s] === 0), [sizes, d.available]);

  const openGuide = () => document.getElementById("tailles")?.setAttribute("open", "");
  const onCta = () => {
    if (!selected) {
      setNeedSize(true); // pas de bouton grisé : on montre où cliquer
      return;
    }
    add([{ designId: d.id, size: selected }]);
  };

  return (
    <div>
      <div className={needSize ? "shake outline outline-1 outline-offset-4 outline-orange" : ""} role="group" aria-label={`Choisir une taille, ${d.name}`}>
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
                className={`min-h-14 px-1 py-2 text-center font-heavy transition-colors ${active ? "bg-ink text-night" : "hover:bg-surface-2"} disabled:cursor-not-allowed disabled:bg-night disabled:text-muted`}
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
        {needSize && <p role="alert" className="mt-2 text-sm font-bold text-orange">Choisis une taille.</p>}
        {canBuy && allSoldOut && <p role="status" className="mt-2 text-sm font-bold text-pink-bright">Épuisé.</p>}
      </div>
      <a href="#tailles" onClick={openGuide} className="mt-2 inline-block text-xs text-muted underline underline-offset-4 hover:text-ink">Guide des tailles</a>

      {canBuy ? (
        <button type="button" className="btn btn-primary btn-square mt-4 w-full !pr-2.5" disabled={allSoldOut || maxedOut} onClick={onCta}>
          {maxedOut ? "Max. dans ton panier" : `Ajouter · ${props.price}`}
          {!maxedOut && <span className="btn-disc" aria-hidden="true">+</span>}
        </button>
      ) : (
        <Link href="/#liste" className="btn btn-primary btn-square mt-4 w-full !pr-2.5">
          Me prévenir
          <span className="btn-disc" aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

/** BuyBox avec sa propre taille choisie (pages produit). */
export function ProductBuy(props: Omit<Parameters<typeof BuyBox>[0], "selected" | "onSelect">) {
  const [selected, setSelected] = useState<Size | null>(null);
  return <BuyBox {...props} selected={selected} onSelect={setSelected} />;
}
