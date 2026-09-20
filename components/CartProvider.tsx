"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

/**
 * Panier (côté navigateur). Il ne calcule JAMAIS un prix ni un stock : les quantités
 * viennent de la personne, les prix de /api/quote, et le paiement de /api/checkout
 * (qui recalcule tout). Le panier est mémorisé dans le navigateur (localStorage) : il
 * survit à un rechargement de la page, sans compte à créer.
 */

export type Size = "S" | "M" | "L" | "XL";
export type CartItem = { designId: string; size: Size; qty: number };
export type CartDesign = {
  id: string;
  name: string;
  madras: string;
  images: { front: string; back: string };
  alt: { front: string; back: string };
  /** Stock disponible par taille (fourni par le serveur). */
  available: Record<Size, number>;
  /** Stock total du design et pièces encore disponibles (toutes tailles), fournis par le serveur. */
  stock: { total: number; left: number };
};
export type Quote = {
  lines: { label: string; unitAmount: number; quantity: number }[];
  shipping: number;
  total: number;
  pieces: number;
  unavailable: string[];
  /** Remise du code promo appliqué (calculée par le serveur), sinon null. */
  discount: { code: string; label: string; amount: number } | null;
  promoError: string | null;
};
export type Delivery = "pickup" | "shipping";

export const CART_STORAGE_KEY = "2tijen-cart-v1";

// ---- Mémoire du navigateur, branchée sur React sans effet (useSyncExternalStore) ----
const listeners = new Set<() => void>();
let memory = ""; // repli si le stockage du navigateur est bloqué (navigation privée…)
const read = () => {
  try {
    return localStorage.getItem(CART_STORAGE_KEY) ?? "";
  } catch {
    return memory;
  }
};
const write = (value: string) => {
  memory = value;
  try {
    localStorage.setItem(CART_STORAGE_KEY, value);
  } catch {
    /* stockage indisponible : on garde la version en mémoire */
  }
  listeners.forEach((l) => l());
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb); // autre onglet
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};

type Stored = { cart: CartItem[]; delivery: Delivery; promo: string };

type CartContextValue = {
  canBuy: boolean;
  designs: CartDesign[];
  cart: CartItem[];
  pieces: number;
  maxPieces: number;
  delivery: Delivery;
  setDelivery: (d: Delivery) => void;
  /** Code promo saisi (vérifié par le serveur à chaque calcul du devis). */
  promo: string;
  applyPromo: (code: string) => void;
  clearPromo: () => void;
  deliveryOptions: { pickupLabel: string; pickupPrice: string; shippingLabel: string; shippingPrice: string };
  quote: Quote | null;
  quoteError: string;
  /** Vrai quand le devis affiché correspond exactement au panier actuel. */
  quoteFresh: boolean;
  blocked: boolean;
  inCart: (designId: string, size: Size) => number;
  add: (items: { designId: string; size: Size }[]) => void;
  setQty: (designId: string, size: Size, qty: number) => void;
  remove: (designId: string, size: Size) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  paying: boolean;
  payError: string;
  pay: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}

export function CartProvider(props: {
  canBuy: boolean;
  designs: CartDesign[];
  maxPieces: number;
  deliveryOptions: CartContextValue["deliveryOptions"];
  accessToken: string | null;
  children: React.ReactNode;
}) {
  const { canBuy, designs, maxPieces, accessToken } = props;
  const router = useRouter();
  const raw = useSyncExternalStore(subscribe, read, () => "");

  // Panier lu dans la mémoire du navigateur, remis d'aplomb : designs et tailles connus,
  // quantités entières, jamais plus que le stock ni que le maximum par commande.
  const { cart, delivery, promo } = useMemo<Stored>(() => {
    let parsed: Partial<Stored> = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      parsed = {};
    }
    const clean: CartItem[] = [];
    let total = 0;
    for (const l of Array.isArray(parsed.cart) ? parsed.cart : []) {
      const design = designs.find((d) => d.id === l?.designId);
      const size = l?.size as Size;
      if (!design || !(size in design.available) || !Number.isInteger(l.qty) || l.qty < 1) continue;
      const qty = Math.min(l.qty, design.available[size], maxPieces - total);
      if (qty < 1) continue;
      clean.push({ designId: design.id, size, qty });
      total += qty;
    }
    const promo = typeof parsed.promo === "string" ? parsed.promo.slice(0, 40) : "";
    return { cart: clean, delivery: parsed.delivery === "shipping" ? "shipping" : "pickup", promo };
  }, [raw, designs, maxPieces]);

  const save = useCallback((next: Stored) => write(JSON.stringify(next)), []);
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const pieces = cart.reduce((n, l) => n + l.qty, 0);
  const inCart = (designId: string, size: Size) => cart.find((l) => l.designId === designId && l.size === size)?.qty ?? 0;

  const add = (items: { designId: string; size: Size }[]) => {
    setPayError("");
    const next = cart.map((l) => ({ ...l }));
    for (const it of items) {
      const design = designs.find((d) => d.id === it.designId);
      if (!design) continue;
      const existing = next.find((l) => l.designId === it.designId && l.size === it.size);
      if (next.reduce((n, l) => n + l.qty, 0) >= maxPieces) break;
      if ((existing?.qty ?? 0) >= design.available[it.size]) continue;
      if (existing) existing.qty += 1;
      else next.push({ designId: it.designId, size: it.size, qty: 1 });
    }
    save({ cart: next, delivery, promo });
    setOpen(true);
  };

  const setQty = (designId: string, size: Size, qty: number) => {
    const design = designs.find((d) => d.id === designId);
    if (!design) return;
    const others = cart.filter((l) => !(l.designId === designId && l.size === size)).reduce((n, l) => n + l.qty, 0);
    const clamped = Math.max(0, Math.min(qty, design.available[size], maxPieces - others));
    save({ cart: cart.map((l) => (l.designId === designId && l.size === size ? { ...l, qty: clamped } : l)).filter((l) => l.qty > 0), delivery, promo });
  };

  // ---- Devis : toujours calculé par le serveur ----
  const cartKey = JSON.stringify([cart, delivery, promo]);
  const [fetched, setFetched] = useState<{ key: string; quote: Quote } | null>(null);
  const [quoteError, setQuoteError] = useState("");
  useEffect(() => {
    if (cart.length === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cart, delivery, promo }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        setFetched({ key: cartKey, quote: data });
        setQuoteError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setQuoteError("Impossible de calculer le total. Réessaie.");
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // cartKey résume cart + delivery
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);
  // On garde l'ancien devis affiché pendant le recalcul, et aucun quand le panier est vide.
  const quote = cart.length ? (fetched?.quote ?? null) : null;
  const blocked = quote ? quote.unavailable.length > 0 : false;

  async function pay() {
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, delivery, accessToken, promo: quote?.discount ? promo : undefined }),
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

  const value: CartContextValue = {
    canBuy,
    designs,
    cart,
    pieces,
    maxPieces,
    delivery,
    setDelivery: (d) => save({ cart, delivery: d, promo }),
    promo,
    applyPromo: (code) => save({ cart, delivery, promo: code.trim().toUpperCase() }),
    clearPromo: () => save({ cart, delivery, promo: "" }),
    deliveryOptions: props.deliveryOptions,
    quote,
    quoteError,
    quoteFresh: fetched?.key === cartKey,
    blocked,
    inCart,
    add,
    setQty,
    remove: (designId, size) => setQty(designId, size, 0),
    open,
    setOpen,
    paying,
    payError,
    pay,
  };
  return <CartContext.Provider value={value}>{props.children}</CartContext.Provider>;
}
