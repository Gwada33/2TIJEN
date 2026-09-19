"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEuros } from "@/lib/format";

/**
 * Boutique (côté navigateur). Ce composant n'affiche que des données fournies
 * par le serveur : il ne calcule JAMAIS un prix ni un stock. Le total du panier
 * vient de /api/quote, et le paiement de /api/checkout (qui recalcule tout).
 */

type Size = "S" | "M" | "L" | "XL";
export type ShopDesign = {
  id: string;
  name: string;
  accent: string;
  images: { front: string; back: string };
  alt: { front: string; back: string };
  available: Record<Size, number>;
};
type CartItem = { designId: string; size: Size; qty: number };
type Quote = {
  lines: { label: string; unitAmount: number; quantity: number }[];
  shipping: number;
  total: number;
  pieces: number;
  unavailable: string[];
};

export type ShopProps = {
  designs: ShopDesign[];
  sizes: Size[];
  mode: "open" | "before" | "closed";
  opensLabel: string;
  /** Prix d'une pièce affiché (calculé par le serveur). */
  price: { current: string; regular: string | null };
  earlyBirdLeft: number | null;
  pack: { price: string; regular: string };
  delivery: { pickupLabel: string; pickupPrice: string; shippingLabel: string; shippingPrice: string };
  lowStock: number;
  maxPieces: number;
  accessToken: string | null;
};

export function Shop(props: ShopProps) {
  const { designs, sizes, mode, lowStock, maxPieces } = props;
  const router = useRouter();
  const canBuy = mode === "open";

  const [selected, setSelected] = useState<Record<string, Size | null>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [delivery, setDelivery] = useState<"pickup" | "shipping">("pickup");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const pieces = cart.reduce((n, l) => n + l.qty, 0);
  const inCart = (designId: string, size: Size) => cart.find((l) => l.designId === designId && l.size === size)?.qty ?? 0;

  // Devis calculé par le serveur à chaque changement du panier.
  useEffect(() => {
    if (cart.length === 0) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cart, delivery }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        setQuote(data);
        setQuoteError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setQuoteError("Impossible de calculer le total. Réessaie.");
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cart, delivery]);

  function add(items: { designId: string; size: Size }[]) {
    setPayError("");
    setCart((prev) => {
      const next = prev.map((l) => ({ ...l }));
      for (const it of items) {
        const design = designs.find((d) => d.id === it.designId)!;
        const existing = next.find((l) => l.designId === it.designId && l.size === it.size);
        const total = next.reduce((n, l) => n + l.qty, 0);
        if (total >= maxPieces) break;
        if ((existing?.qty ?? 0) >= design.available[it.size]) continue;
        if (existing) existing.qty += 1;
        else next.push({ designId: it.designId, size: it.size, qty: 1 });
      }
      return next;
    });
  }

  function change(designId: string, size: Size, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.designId === designId && l.size === size ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }

  async function pay() {
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, delivery, accessToken: props.accessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.soldOut) router.refresh(); // remet le stock à jour
        throw new Error(data.error || "Erreur, réessaie.");
      }
      window.location.href = data.url;
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Erreur, réessaie.");
      setPaying(false);
    }
  }

  const bothSelected = designs.every((d) => selected[d.id]);
  const blocked = quote ? quote.unavailable.length > 0 : false;

  return (
    <>
      <section id="pieces" aria-labelledby="titre-pieces" className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <h2 id="titre-pieces" className="reveal font-heavy text-4xl font-normal uppercase leading-none sm:text-6xl">Les 2 pièces</h2>

        <div className="mt-10 grid gap-12 md:grid-cols-2 md:gap-10">
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
        <div className="reveal madras-bg relative mt-14 overflow-hidden rounded-[2.5rem] border border-white/10 p-6 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-heavy text-3xl font-normal uppercase sm:text-4xl">Pack 2 designs</h3>
              <p className="mt-2 text-lg">
                <span className="font-heavy text-4xl">{props.pack.price}</span>{" "}
                <span className="text-ink/70 line-through">{props.pack.regular}</span>
              </p>
              <p className="mt-1 text-ink/80">Guadeloupean + Martinican</p>
            </div>
            {canBuy ? (
              <button
                type="button"
                className="btn btn-primary w-full !pr-2.5 sm:w-80"
                disabled={!bothSelected}
                onClick={() => add(designs.map((d) => ({ designId: d.id, size: selected[d.id]! })))}
              >
                {bothSelected ? "Ajouter le pack" : "Choisis une taille par design"}
                <span className="btn-disc" aria-hidden="true">+</span>
              </button>
            ) : (
              <p className="font-bold">{mode === "before" ? `Ouverture ${props.opensLabel}` : "Préco terminée"}</p>
            )}
          </div>
        </div>
      </section>

      {/* Panier */}
      {canBuy && cart.length > 0 && (
        <section id="panier" aria-labelledby="titre-panier" className="mx-auto max-w-3xl scroll-mt-20 px-5 pb-28">
          <div className="rounded-[2rem] border border-ink/40 bg-surface p-6 sm:p-8">
            <h2 id="titre-panier" className="font-heavy text-3xl font-normal uppercase">Ton panier</h2>

            <ul className="mt-5 divide-y divide-line">
              {cart.map((l) => {
                const design = designs.find((d) => d.id === l.designId)!;
                return (
                  <li key={`${l.designId}-${l.size}`} className="flex items-center justify-between gap-3 py-3">
                    <span className="font-bold">{design.name} <span className="font-normal text-muted">· taille {l.size}</span></span>
                    <span className="flex items-center gap-2">
                      <button type="button" aria-label={`Retirer une pièce ${design.name} ${l.size}`} className="h-11 w-11 rounded-full border-2 border-ink text-xl font-bold transition-colors hover:bg-ink hover:text-night" onClick={() => change(l.designId, l.size, -1)}>−</button>
                      <span className="w-6 text-center font-bold" aria-live="polite">{l.qty}</span>
                      <button
                        type="button"
                        aria-label={`Ajouter une pièce ${design.name} ${l.size}`}
                        className="h-11 w-11 rounded-full border-2 border-ink text-xl font-bold transition-colors hover:bg-ink hover:text-night disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
                        disabled={l.qty >= design.available[l.size] || pieces >= maxPieces}
                        onClick={() => change(l.designId, l.size, 1)}
                      >+</button>
                    </span>
                  </li>
                );
              })}
            </ul>

            <fieldset className="mt-6">
              <legend className="mb-2 font-bold">Livraison</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["pickup", props.delivery.pickupLabel, props.delivery.pickupPrice],
                    ["shipping", props.delivery.shippingLabel, props.delivery.shippingPrice],
                  ] as const
                ).map(([value, label, cost]) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 ${delivery === value ? "border-sun bg-surface-2" : "border-line"}`}>
                    <input type="radio" name="delivery" value={value} checked={delivery === value} onChange={() => setDelivery(value)} className="h-5 w-5 accent-sun" />
                    <span className="leading-tight"><span className="block font-bold">{label}</span><span className="text-sm text-muted">{cost}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 space-y-1" aria-live="polite">
              {quote?.lines.map((l) => (
                <p key={l.label} className="flex justify-between gap-4 text-sm">
                  <span>{l.quantity > 1 ? `${l.quantity} × ` : ""}{l.label}</span>
                  <span className="font-bold">{formatEuros(l.unitAmount * l.quantity)}</span>
                </p>
              ))}
              {quote && (
                <>
                  <p className="flex justify-between text-sm"><span>Livraison</span><span className="font-bold">{quote.shipping === 0 ? "Gratuite" : formatEuros(quote.shipping)}</span></p>
                  <p className="flex justify-between border-t border-line pt-3 font-heavy text-2xl"><span>Total</span><span>{formatEuros(quote.total)}</span></p>
                </>
              )}
              {!quote && !quoteError && <p className="text-muted">Calcul du total…</p>}
              {quoteError && <p role="alert" className="font-bold text-orange">{quoteError}</p>}
              {blocked && (
                <p role="alert" className="font-bold text-orange">
                  Plus assez de stock pour : {quote!.unavailable.join(", ")}. Retire une pièce.
                </p>
              )}
            </div>

            <button type="button" className="btn btn-primary mt-6 w-full !pr-2.5" disabled={paying || !quote || blocked} onClick={pay}>
              {paying ? "Redirection vers le paiement…" : "Payer en toute sécurité"}
              {!paying && <span className="btn-disc" aria-hidden="true">→</span>}
            </button>
            {payError && <p role="alert" className="mt-3 font-bold text-orange">{payError}</p>}
            <p className="mt-3 text-center text-sm text-muted">Paiement Stripe · pièces réservées 15 min</p>
          </div>
        </section>
      )}

      {/* Barre du bas (mobile) */}
      {canBuy && pieces > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-night/95 p-3 backdrop-blur sm:hidden">
          <a href="#panier" className="btn btn-primary w-full">
            Voir mon panier · {pieces} pièce{pieces > 1 ? "s" : ""}{quote ? ` · ${formatEuros(quote.total)}` : ""}
          </a>
        </div>
      )}
    </>
  );
}

function ProductCard(props: {
  design: ShopDesign;
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
    <article className="reveal flex flex-col" aria-labelledby={`p-${d.id}`} style={{ "--accent": d.accent } as React.CSSProperties}>
      <div className="madras-frame rounded-[2.4rem] shadow-[0_18px_40px_-18px_rgb(200_35_27/0.55)]">
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={`${d.name} : voir ${flipped ? "le motif" : "l'autre côté"} du t-shirt`}
        className="card-tee group relative block aspect-[5/4] w-full cursor-pointer overflow-hidden rounded-[calc(2.4rem-5px)] bg-night text-left"
        onPointerDown={(e) => { pointer.current = e.pointerType; }}
        onKeyDown={() => { pointer.current = "key"; }}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") setFlipped(true); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setFlipped(false); }}
        onClick={() => { if (pointer.current !== "mouse") setFlipped((f) => !f); }}
      >
        <span className="tee-halo absolute inset-0" aria-hidden="true" />
        <span className="flip-stage absolute inset-0 block">
          <span className="flip-card block" data-flipped={flipped}>
            <span className="flip-face">
              <Image
                src={d.images.back}
                alt={flipped ? "" : d.alt.back}
                fill
                sizes="(min-width: 768px) 46vw, 92vw"
                className="tee-shot object-contain p-3"
              />
            </span>
            <span className="flip-face flip-face-back">
              <Image
                src={d.images.front}
                alt={flipped ? d.alt.front : ""}
                fill
                sizes="(min-width: 768px) 46vw, 92vw"
                className="tee-shot object-contain p-3"
              />
            </span>
          </span>
        </span>
        <span className="absolute right-3 top-3 rotate-6 rounded-md bg-sun px-2 py-1 font-heavy text-xs uppercase tracking-wider text-night transition-transform duration-300 group-hover:rotate-0 group-hover:scale-110" aria-hidden="true">
          50 ex. numérotés
        </span>
        <span className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full border border-line bg-night/80 text-xl backdrop-blur transition-transform duration-500 group-hover:rotate-180" aria-hidden="true">
          ↻
        </span>
      </button>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <h3 id={`p-${d.id}`} className="font-heavy text-2xl font-normal uppercase leading-tight sm:text-3xl">{d.name}</h3>
        <p className="shrink-0 text-right">
          <span className="block font-heavy text-2xl">{props.price.current}</span>
          {props.price.regular && <span className="text-sm text-muted line-through">{props.price.regular}</span>}
        </p>
      </div>
      {props.price.regular && props.earlyBirdLeft !== null && canBuy && (
        <p className="mt-2 inline-block self-start rounded-full bg-pink-bright px-3 py-1 text-sm font-bold text-night">
          Early bird : plus que {props.earlyBirdLeft} pièce{props.earlyBirdLeft > 1 ? "s" : ""} à ce prix
        </p>
      )}

      <div className="mt-5" role="group" aria-label={`Choisir une taille, ${d.name}`}>
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
                aria-label={soldOut ? `Taille ${s}, épuisé` : `Taille ${s}`}
                onClick={() => props.onSelect(s)}
                className={`min-h-14 rounded-full border-2 px-1 py-2 text-center font-heavy transition duration-200 ${
                  active ? "-translate-y-0.5 border-ink bg-ink text-night" : "border-line bg-surface hover:-translate-y-0.5 hover:border-ink"
                } disabled:cursor-not-allowed disabled:border-line disabled:bg-night disabled:text-muted disabled:hover:translate-y-0`}
              >
                <span className={`block text-base ${soldOut ? "line-through" : ""}`}>{s}</span>
                {canBuy && (
                  <span className="block text-[0.7rem] font-bold leading-tight">
                    {soldOut ? "Épuisé" : left <= lowStock ? `Plus que ${left}` : " "}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 min-h-6 text-sm font-bold text-pink-bright" aria-live="polite">
          {canBuy && selected && remaining !== null && remaining <= lowStock && remaining > 0 && `Plus que ${remaining} en ${selected}`}
          {canBuy && allSoldOut && "Ce design est épuisé."}
        </p>
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
