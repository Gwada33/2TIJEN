"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { formatEuros } from "@/lib/format";
import { useCart } from "@/components/CartProvider";

/** Bouton « panier » du header : sac + nombre de pièces. */
export function CartButton() {
  const { canBuy, pieces, setOpen } = useCart();
  if (!canBuy) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Ouvrir le panier, ${pieces} pièce${pieces > 1 ? "s" : ""}`}
      className="relative grid h-11 w-11 place-items-center rounded-full border border-line transition-colors hover:border-ink"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {pieces > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1 text-[0.65rem] font-black text-night" aria-hidden="true">
          {pieces}
        </span>
      )}
    </button>
  );
}

/** Panier en volet latéral (élément <dialog> : Échap pour fermer, focus gardé dedans). */
export function CartDrawer() {
  const c = useCart();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (c.open && !d.open) d.showModal();
    if (!c.open && d.open) d.close();
    document.body.style.overflow = c.open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [c.open]);

  // Étape 1 : panier et livraison. Étape 2 : coordonnées, puis paiement chez SumUp.
  const [step, setStep] = useState<"cart" | "details">("cart");
  const details = step === "details" && c.cart.length > 0;
  const [promoInput, setPromoInput] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const design = (id: string) => c.designs.find((d) => d.id === id)!;
  const opt = c.deliveryOptions;

  return (
    <dialog
      ref={ref}
      aria-labelledby="titre-panier"
      className="cart-drawer"
      onClose={() => {
        c.setOpen(false);
        setStep("cart");
      }}
      onClick={(e) => {
        if (e.target === ref.current) c.setOpen(false); // clic sur le fond
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="titre-panier" className="font-heavy text-sm uppercase tracking-[0.15em]">
            {details ? "Tes coordonnées" : `Panier${c.pieces > 0 ? ` · ${c.pieces}` : ""}`}
          </h2>
          <button type="button" onClick={() => c.setOpen(false)} aria-label="Fermer le panier" className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg hover:border-ink">
            ✕
          </button>
        </div>

        {c.cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 text-center">
            <p className="text-muted">Ton panier est vide.</p>
            <button type="button" className="btn btn-ghost" onClick={() => c.setOpen(false)}>
              Voir les pièces
            </button>
          </div>
        ) : (
          <>
            {details ? (
              <form id="checkout-form" className="flex-1 space-y-4 overflow-y-auto px-5 py-5" onSubmit={(e) => { e.preventDefault(); void c.pay(); }}>
                <Field label="E-mail" name="email" type="email" autoComplete="email" required value={c.customer.email} onChange={(v) => c.setCustomer({ email: v })} />
                <Field label="Nom et prénom" name="name" autoComplete="name" required value={c.customer.name} onChange={(v) => c.setCustomer({ name: v })} />
                <Field label="Téléphone (facultatif)" name="phone" type="tel" autoComplete="tel" value={c.customer.phone} onChange={(v) => c.setCustomer({ phone: v })} />
                {c.delivery === "shipping" && (
                  <>
                    <Field label="Adresse" name="line1" autoComplete="address-line1" required value={c.customer.line1} onChange={(v) => c.setCustomer({ line1: v })} />
                    <div className="grid grid-cols-[7rem_1fr] gap-3">
                      <Field label="Code postal" name="postal_code" autoComplete="postal-code" inputMode="numeric" required value={c.customer.postal_code} onChange={(v) => c.setCustomer({ postal_code: v })} />
                      <Field label="Ville" name="city" autoComplete="address-level2" required value={c.customer.city} onChange={(v) => c.setCustomer({ city: v })} />
                    </div>
                  </>
                )}
              </form>
            ) : (
            <div className="flex-1 overflow-y-auto px-5">
              <ul className="divide-y divide-line">
                {c.cart.map((l) => {
                  const d = design(l.designId);
                  const stock = d.available[l.size];
                  return (
                    <li key={`${l.designId}-${l.size}`} className="flex gap-4 py-4">
                      <div className="relative h-20 w-24 shrink-0 overflow-hidden bg-surface">
                        <Image src={d.images.back} alt="" fill sizes="96px" className="object-contain p-1" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <p className="font-heavy text-xs uppercase leading-snug tracking-wide">{d.name}</p>
                          <p className="mt-1 text-sm text-muted">Taille {l.size}</p>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button type="button" aria-label={`Retirer une pièce ${d.name} ${l.size}`} onClick={() => c.setQty(l.designId, l.size, l.qty - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-line hover:border-ink">
                              −
                            </button>
                            <span className="w-8 text-center font-bold" aria-live="polite">{l.qty}</span>
                            <button
                              type="button"
                              aria-label={`Ajouter une pièce ${d.name} ${l.size}`}
                              disabled={l.qty >= stock || c.pieces >= c.maxPieces}
                              onClick={() => c.setQty(l.designId, l.size, l.qty + 1)}
                              className="grid h-9 w-9 place-items-center rounded-full border border-line hover:border-ink disabled:opacity-30 disabled:hover:border-line"
                            >
                              +
                            </button>
                          </div>
                          <button type="button" onClick={() => c.remove(l.designId, l.size)} className="text-xs text-muted underline underline-offset-4 hover:text-ink">
                            Retirer
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {c.pieces >= c.maxPieces && <p className="pb-3 text-xs text-muted">Maximum {c.maxPieces} pièces par commande.</p>}

              <fieldset className="mt-4 pb-4">
                <legend className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted">Livraison</legend>
                <div className="space-y-2">
                  {(
                    [
                      ["pickup", opt.pickupLabel, opt.pickupPrice],
                      ["shipping", opt.shippingLabel, opt.shippingPrice],
                    ] as const
                  ).map(([value, label, cost]) => (
                    <label key={value} className={`flex cursor-pointer items-center gap-3 border p-4 ${c.delivery === value ? "border-sun bg-surface-2" : "border-line"}`}>
                      <input type="radio" name="delivery" value={value} checked={c.delivery === value} onChange={() => c.setDelivery(value)} className="h-4 w-4 accent-sun" />
                      <span className="flex-1 text-sm leading-tight">{label}</span>
                      <span className="text-sm text-muted">{cost}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            )}

            <div className="border-t border-line bg-night px-5 pb-5 pt-4">
              {/* Code de réduction */}
              {!details && (<>
              {c.quote?.discount ? (
                <div className="mb-4 flex items-center justify-between border border-sun/50 bg-surface px-3 py-2 text-sm">
                  <span><span className="font-heavy text-xs tracking-wider">{c.quote.discount.code}</span> <span className="text-muted">appliqué</span></span>
                  <button type="button" onClick={() => { c.clearPromo(); setPromoInput(""); }} className="text-xs text-muted underline underline-offset-4 hover:text-ink">Retirer</button>
                </div>
              ) : !promoOpen && !c.promo ? (
                // Replié par défaut : gagne de la place sur les petits écrans
                <button type="button" onClick={() => setPromoOpen(true)} className="mb-2 inline-flex min-h-11 items-center text-xs text-muted underline underline-offset-4 hover:text-ink">
                  Code de réduction
                </button>
              ) : (
                <form
                  className="mb-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (promoInput.trim()) c.applyPromo(promoInput);
                  }}
                >
                  <label htmlFor="promo" className="sr-only">Code de réduction</label>
                  <div className="flex gap-2">
                    <input
                      id="promo"
                      autoFocus={promoOpen}
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Code de réduction"
                      autoComplete="off"
                      autoCapitalize="characters"
                      className="min-w-0 flex-1 border border-line bg-night px-3 py-2.5 text-sm uppercase text-ink placeholder:normal-case placeholder:text-muted focus:border-sun focus:outline-none"
                    />
                    <button type="submit" className="border border-ink px-4 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-night">Appliquer</button>
                  </div>
                  {c.quote?.promoError && c.promo && <p role="alert" className="mt-2 text-sm font-bold text-orange">{c.quote.promoError}</p>}
                </form>
              )}
              </>)}
              <div className="space-y-1" aria-live="polite">
                {!details && c.quote?.lines.map((l) => (
                  <p key={l.label} className="flex justify-between gap-4 text-sm text-muted">
                    <span>{l.quantity > 1 ? `${l.quantity} × ` : ""}{l.label}</span>
                    <span className="shrink-0 text-ink">{formatEuros(l.unitAmount * l.quantity)}</span>
                  </p>
                ))}
                {c.quote && (
                  <>
                    {!details && c.quote.discount && (
                      <p className="flex justify-between text-sm text-muted"><span>Code {c.quote.discount.code}</span><span className="text-sun">−{formatEuros(c.quote.discount.amount)}</span></p>
                    )}
                    {!details && <p className="flex justify-between text-sm text-muted"><span>Livraison</span><span className="text-ink">{c.quote.shipping === 0 ? "Gratuite" : formatEuros(c.quote.shipping)}</span></p>}
                    <p className={`flex justify-between font-heavy text-lg ${details ? "" : "border-t border-line pt-3"}`}><span>Total</span><span>{formatEuros(c.quote.total)}</span></p>
                  </>
                )}
                {!c.quote && !c.quoteError && <p className="text-sm text-muted">Calcul du total…</p>}
                {c.quoteError && <p role="alert" className="text-sm font-bold text-orange">{c.quoteError}</p>}
                {c.blocked && (
                  <p role="alert" className="text-sm font-bold text-orange">Plus assez de stock pour : {c.quote!.unavailable.join(", ")}. Retire une pièce.</p>
                )}
              </div>
              {details ? (
                <>
                  <button type="submit" form="checkout-form" className="btn btn-primary mt-4 w-full !pr-2.5" disabled={c.paying || !c.quote || !c.quoteFresh || c.blocked}>
                    {c.paying ? "Redirection…" : "Payer"}
                    {!c.paying && <span className="btn-disc" aria-hidden="true">→</span>}
                  </button>
                  {c.payError && <p role="alert" className="mt-3 text-sm font-bold text-orange">{c.payError}</p>}
                  <button type="button" onClick={() => setStep("cart")} className="mt-1 inline-flex min-h-11 w-full items-center justify-center text-xs text-muted underline underline-offset-4 hover:text-ink">← Retour au panier</button>
                  <p className="text-center text-xs text-muted">Paiement sécurisé · SumUp · Apple Pay</p>
                </>
              ) : (
                <button type="button" className="btn btn-primary mt-4 w-full !pr-2.5" disabled={!c.quote || !c.quoteFresh || c.blocked} onClick={() => setStep("details")}>
                  Continuer
                  <span className="btn-disc" aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

function Field(props: { label: string; name: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string; inputMode?: "numeric"; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-muted">{props.label}</span>
      <input
        name={props.name}
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        inputMode={props.inputMode}
        required={props.required}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="min-h-12 w-full border border-line bg-night px-3 text-base text-ink focus:border-sun focus:outline-none"
      />
    </label>
  );
}
