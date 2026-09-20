import "server-only";
import { randomUUID } from "node:crypto";
import { drop, getDesign, totalPiecesFor, type Size } from "@/config/drop";
import { CartError, computeQuote, type CartLine, type Quote } from "@/lib/pricing";

/**
 * Achat SIMULÉ pour le mode démo (DEMO_NO_DB=1, développement uniquement).
 * Permet de dérouler tout le parcours (panier → paiement → merci avec numéro de pièce)
 * sans compte Stripe ni Supabase. Rien n'est envoyé à Stripe, aucune carte n'est utilisée.
 * Les données vivent en mémoire : elles disparaissent quand on redémarre le serveur.
 */

export type DemoPiece = { designId: string; size: Size; number: number; unitAmount: number };
export type DemoOrder = {
  id: string;
  delivery: "pickup" | "shipping";
  quote: Quote;
  shipping: number;
  total: number;
  pieces: DemoPiece[] | null; // renseigné une fois « payé »
};

type Store = {
  sold: Record<string, Partial<Record<Size, number>>>;
  lastNumber: Record<string, number>;
  orders: Map<string, DemoOrder>;
};

// globalThis : partagé entre les pages, les routes API et les rechargements à chaud.
const g = globalThis as unknown as { __2tijenDemo?: Store };
const store = (): Store => (g.__2tijenDemo ??= { sold: {}, lastNumber: {}, orders: new Map() });

/** Mode démo + clé Stripe de TEST (sk_test_…) : le paiement passe par la vraie page Stripe, mais sans base de données. Jamais avec une clé live. */
export const demoStripeEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.DEMO_NO_DB === "1" && (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");

export const demoSold = () => store().sold;
export const demoOrder = (id: string) => store().orders.get(id);

const soldOf = (designId: string, size: Size) => store().sold[designId]?.[size] ?? 0;
const totalSold = () => Object.values(store().sold).reduce((n, bySize) => n + Object.values(bySize).reduce((a, b) => a + (b ?? 0), 0), 0);

function assertAvailable(cart: CartLine[]) {
  for (const l of cart) {
    const design = getDesign(l.designId)!;
    if (design.stock[l.size] - soldOf(l.designId, l.size) < l.qty) {
      throw new CartError(`Désolé, ${design.name} en taille ${l.size} n'est plus disponible.`);
    }
  }
}

/** Équivalent de « créer la session Stripe » : prix calculés côté serveur. */
export function demoCreateSession(cart: CartLine[], delivery: "pickup" | "shipping", now: Date): DemoOrder {
  assertAvailable(cart);
  const quote = computeQuote(cart, totalSold(), now);
  const shipping = delivery === "shipping" ? drop.shipping.metropolePrice : drop.shipping.pickupPrice;
  const order: DemoOrder = { id: randomUUID(), delivery, quote, shipping, total: quote.total + shipping, pieces: null };
  store().orders.set(order.id, order);
  return order;
}

/** Équivalent du webhook « paiement réussi » : décrémente le stock et numérote les pièces. */
export function demoPay(id: string): DemoOrder {
  const s = store();
  const order = s.orders.get(id);
  if (!order) throw new CartError("Commande introuvable (le serveur a redémarré ?).");
  if (order.pieces) return order; // déjà payée : on ne recompte pas
  assertAvailable(
    Object.values(
      order.quote.units.reduce<Record<string, CartLine>>((acc, u) => {
        const key = `${u.designId}:${u.size}`;
        (acc[key] ??= { designId: u.designId, size: u.size, qty: 0 }).qty += 1;
        return acc;
      }, {}),
    ),
  );
  order.pieces = order.quote.units.map((u) => {
    s.sold[u.designId] ??= {};
    s.sold[u.designId][u.size] = (s.sold[u.designId][u.size] ?? 0) + 1;
    s.lastNumber[u.designId] = (s.lastNumber[u.designId] ?? 0) + 1;
    return { designId: u.designId, size: u.size, number: s.lastNumber[u.designId], unitAmount: u.allocatedAmount };
  });
  return order;
}

export const demoTotalFor = (designId: string) => {
  const d = getDesign(designId);
  return d ? totalPiecesFor(d) : 0;
};
