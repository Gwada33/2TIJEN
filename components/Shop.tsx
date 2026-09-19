"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
  tagline: string;
  description: string;
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
        <h2 id="titre-pieces" className="font-black text-4xl uppercase leading-none sm:text-6xl">Les 2 pièces</h2>
        <p className="mt-3 max-w-xl text-lg text-muted">
          T-shirts oversize noirs, 50 pièces par design, chacune numérotée.
        </p>

        <div className="mt-10 grid gap-12 md:grid-cols-2 md:gap-8">
          {designs.map((d, idx) => (
            <ProductCard
              key={d.id}
              design={d}
              sizes={sizes}
              priority={idx === 0}
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
        <div className="mt-14 rounded-[2rem] bg-pink-soft p-6 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-pink-deep">Le bon plan</p>
              <h3 className="mt-1 font-black text-3xl uppercase sm:text-4xl">Pack 2 designs</h3>
              <p className="mt-2 text-lg">
                <span className="text-3xl font-black">{props.pack.price}</span>{" "}
                <span className="text-muted line-through">{props.pack.regular}</span>
              </p>
              <p className="mt-1 text-muted">Un Guadeloupean + un Martinican. Le meilleur prix est appliqué automatiquement.</p>
            </div>
            {canBuy ? (
              <div className="sm:w-72">
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  disabled={!bothSelected}
                  onClick={() => add(designs.map((d) => ({ designId: d.id, size: selected[d.id]! })))}
                >
                  Ajouter le pack au panier
                </button>
                {!bothSelected && (
                  <p className="mt-2 text-sm text-muted">Choisis d&apos;abord une taille pour chaque design ci-dessus.</p>
                )}
              </div>
            ) : (
              <p className="font-bold">{mode === "before" ? `Ouverture ${props.opensLabel}` : "Préco terminée"}</p>
            )}
          </div>
        </div>
      </section>

      {/* Panier */}
      {canBuy && cart.length > 0 && (
        <section id="panier" aria-labelledby="titre-panier" className="mx-auto max-w-3xl scroll-mt-20 px-5 pb-28">
          <div className="rounded-[2rem] border-2 border-ink p-6 sm:p-8">
            <h2 id="titre-panier" className="font-black text-3xl uppercase">Ton panier</h2>

            <ul className="mt-5 divide-y divide-line">
              {cart.map((l) => {
                const design = designs.find((d) => d.id === l.designId)!;
                return (
                  <li key={`${l.designId}-${l.size}`} className="flex items-center justify-between gap-3 py-3">
                    <span className="font-bold">{design.name} <span className="font-normal text-muted">· taille {l.size}</span></span>
                    <span className="flex items-center gap-2">
                      <button type="button" aria-label={`Retirer une pièce ${design.name} ${l.size}`} className="h-11 w-11 rounded-full border-2 border-ink text-xl font-bold" onClick={() => change(l.designId, l.size, -1)}>−</button>
                      <span className="w-6 text-center font-bold" aria-live="polite">{l.qty}</span>
                      <button
                        type="button"
                        aria-label={`Ajouter une pièce ${design.name} ${l.size}`}
                        className="h-11 w-11 rounded-full border-2 border-ink text-xl font-bold disabled:opacity-30"
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
                  <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 ${delivery === value ? "border-ink bg-cream" : "border-line"}`}>
                    <input type="radio" name="delivery" value={value} checked={delivery === value} onChange={() => setDelivery(value)} className="h-5 w-5 accent-ink" />
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
                  <p className="flex justify-between border-t border-line pt-3 text-2xl font-black"><span>Total</span><span>{formatEuros(quote.total)}</span></p>
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

            <button type="button" className="btn btn-primary mt-6 w-full text-lg" disabled={paying || !quote || blocked} onClick={pay}>
              {paying ? "Redirection vers le paiement…" : "Payer en toute sécurité"}
            </button>
            {payError && <p role="alert" className="mt-3 font-bold text-orange">{payError}</p>}
            <p className="mt-3 text-center text-sm text-muted">Paiement sécurisé par Stripe. Tes pièces sont réservées 15 minutes.</p>
          </div>
        </section>
      )}

      {/* Barre du bas (mobile) */}
      {canBuy && pieces > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 backdrop-blur sm:hidden">
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
  priority: boolean;
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
  const [view, setView] = useState<"front" | "back">("back");
  const canBuy = mode === "open";
  const remaining = selected ? d.available[selected] : null;
  const allSoldOut = useMemo(() => sizes.every((s) => d.available[s] === 0), [sizes, d.available]);

  return (
    <article className="flex flex-col" aria-labelledby={`p-${d.id}`}>
      <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] bg-white ring-1 ring-line">
        <Image
          src={d.images[view]}
          alt={d.alt[view]}
          fill
          sizes="(min-width: 768px) 46vw, 92vw"
          priority={props.priority}
          className="object-contain"
        />
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white p-1 shadow" role="group" aria-label={`Vue du t-shirt ${d.name}`}>
          {(["front", "back"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`min-h-11 rounded-full px-5 text-sm font-bold ${view === v ? "bg-ink text-white" : "text-ink"}`}
            >
              {v === "front" ? "Face" : "Dos"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h3 id={`p-${d.id}`} className="font-black text-2xl uppercase leading-tight sm:text-3xl">{d.name}</h3>
          <p className="mt-1 text-muted">{d.tagline}</p>
        </div>
        <p className="shrink-0 text-right">
          <span className="block text-2xl font-black">{props.price.current}</span>
          {props.price.regular && <span className="text-sm text-muted line-through">{props.price.regular}</span>}
        </p>
      </div>
      {props.price.regular && props.earlyBirdLeft !== null && canBuy && (
        <p className="mt-2 inline-block self-start rounded-full bg-pink-soft px-3 py-1 text-sm font-bold text-pink-deep">
          Early bird : plus que {props.earlyBirdLeft} pièce{props.earlyBirdLeft > 1 ? "s" : ""} à ce prix
        </p>
      )}
      <p className="mt-3 text-sm text-muted">{d.description}</p>

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
                className={`min-h-14 rounded-2xl border-2 px-1 py-2 text-center font-black transition ${
                  active ? "border-ink bg-ink text-white" : "border-ink/25 bg-white hover:border-ink"
                } disabled:cursor-not-allowed disabled:border-line disabled:bg-cream disabled:text-muted`}
              >
                <span className={`block text-lg ${soldOut ? "line-through" : ""}`}>{s}</span>
                {canBuy && (
                  <span className="block text-[0.7rem] font-bold leading-tight">
                    {soldOut ? "Épuisé" : left <= lowStock ? `Plus que ${left}` : " "}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 min-h-6 text-sm font-bold text-pink-deep" aria-live="polite">
          {canBuy && selected && remaining !== null && remaining <= lowStock && remaining > 0 && `Plus que ${remaining} en ${selected}`}
          {canBuy && allSoldOut && "Ce design est épuisé."}
        </p>
      </div>

      {canBuy ? (
        <button
          type="button"
          className="btn btn-primary mt-2 w-full"
          disabled={!selected || (remaining ?? 0) <= props.inCart(selected)}
          onClick={() => selected && props.onAdd(selected)}
        >
          {selected ? "Ajouter au panier" : "Choisis ta taille"}
        </button>
      ) : (
        <p className="btn btn-ghost mt-2 w-full" aria-disabled="true">
          {mode === "before" ? `Ouverture ${props.opensLabel}` : "Préco terminée"}
        </p>
      )}
    </article>
  );
}
