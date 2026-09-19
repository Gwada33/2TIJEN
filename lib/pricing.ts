import { drop, getDesign, SIZES, type Size } from "@/config/drop";
import { earlyBirdEndsAt } from "@/lib/drop-state";

/**
 * Calcul des prix. TOUJOURS appelé côté serveur : le navigateur n'envoie jamais
 * de prix, seulement « quel design, quelle taille, combien ».
 */

export type CartLine = { designId: string; size: Size; qty: number };

/** Une pièce physique, avec son prix individuel et si elle a le prix early bird. */
export type Unit = { designId: string; size: Size; earlyBird: boolean; unitAmount: number };

/** Une ligne facturée (ce que Stripe affichera). */
export type PricedLine = {
  kind: "piece" | "pack";
  label: string;
  /** Prix unitaire de la ligne, en centimes. */
  unitAmount: number;
  quantity: number;
  earlyBird: boolean;
  units: { designId: string; size: Size }[];
};

export type Quote = {
  lines: PricedLine[];
  /** Détail pièce par pièce (avec prix alloué), pour l'enregistrement en base. */
  units: (Unit & { pack: boolean; allocatedAmount: number })[];
  total: number;
  pieces: number;
};

export type PricingRules = Pick<typeof drop, "prices" | "earlyBird">;

export class CartError extends Error {}

/** Vérifie et nettoie un panier venu du navigateur. Lève CartError si invalide. */
export function validateCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new CartError("Panier vide.");
  const merged = new Map<string, CartLine>();
  for (const item of raw) {
    const { designId, size, qty } = (item ?? {}) as Record<string, unknown>;
    if (typeof designId !== "string" || !getDesign(designId)) throw new CartError("Design inconnu.");
    if (typeof size !== "string" || !(SIZES as readonly string[]).includes(size)) throw new CartError("Taille inconnue.");
    if (!Number.isInteger(qty) || (qty as number) < 1 || (qty as number) > drop.maxPiecesPerOrder) {
      throw new CartError("Quantité invalide.");
    }
    const key = `${designId}:${size}`;
    const existing = merged.get(key);
    if (existing) existing.qty += qty as number;
    else merged.set(key, { designId, size: size as Size, qty: qty as number });
  }
  const lines = [...merged.values()];
  const pieces = lines.reduce((n, l) => n + l.qty, 0);
  if (pieces > drop.maxPiecesPerOrder) {
    throw new CartError(`Maximum ${drop.maxPiecesPerOrder} pièces par commande.`);
  }
  return lines;
}

/**
 * @param piecesBefore nombre de pièces déjà vendues OU réservées (tous designs)
 *                     au moment où ce panier est réservé. Fourni par la base.
 * @param now          date courante (pour la durée de l'early bird)
 */
export function computeQuote(
  cart: CartLine[],
  piecesBefore: number,
  now: Date,
  rules: PricingRules = drop,
  designIds: string[] = drop.designs.map((d) => d.id),
): Quote {
  const earlyByTime = now < earlyBirdEndsAt();

  // 1. Une entrée par pièce physique, dans l'ordre du panier.
  const units: Unit[] = [];
  for (const line of cart) {
    for (let i = 0; i < line.qty; i++) {
      const position = piecesBefore + units.length;
      const earlyBird = earlyByTime && position < rules.earlyBird.maxPieces;
      units.push({
        designId: line.designId,
        size: line.size,
        earlyBird,
        unitAmount: earlyBird ? rules.prices.earlyBird : rules.prices.regular,
      });
    }
  }

  // 2. Packs : on associe une pièce de chaque design. On ne vend en pack que
  //    si c'est réellement moins cher que les prix à l'unité (ex. 2 pièces early
  //    bird = 64 € < pack 65 €).
  const byDesign = new Map<string, number[]>();
  units.forEach((u, idx) => {
    const list = byDesign.get(u.designId) ?? [];
    list.push(idx);
    byDesign.set(u.designId, list);
  });
  const packCount = Math.min(...designIds.map((id) => byDesign.get(id)?.length ?? 0));

  const inPack = new Set<number>();
  const packs: number[][] = [];
  for (let p = 0; p < packCount; p++) {
    const members = designIds.map((id) => byDesign.get(id)![p]);
    const individual = members.reduce((sum, idx) => sum + units[idx].unitAmount, 0);
    if (rules.prices.pack < individual) {
      packs.push(members);
      members.forEach((idx) => inPack.add(idx));
    }
  }

  // 3. Lignes facturées.
  const lines: PricedLine[] = [];
  const allocated = new Map<number, number>();

  packs.forEach((members) => {
    const names = members.map((idx) => `${getDesign(units[idx].designId)!.name} ${units[idx].size}`);
    lines.push({
      kind: "pack",
      label: `Pack 2 designs (${names.join(" + ")})`,
      unitAmount: rules.prices.pack,
      quantity: 1,
      earlyBird: false,
      units: members.map((idx) => ({ designId: units[idx].designId, size: units[idx].size })),
    });
    // Répartition du prix du pack entre ses pièces (le reste va à la première).
    const share = Math.floor(rules.prices.pack / members.length);
    members.forEach((idx, i) =>
      allocated.set(idx, i === 0 ? rules.prices.pack - share * (members.length - 1) : share),
    );
  });

  const grouped = new Map<string, PricedLine>();
  units.forEach((u, idx) => {
    if (inPack.has(idx)) return;
    allocated.set(idx, u.unitAmount);
    const key = `${u.designId}:${u.size}:${u.earlyBird}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += 1;
      existing.units.push({ designId: u.designId, size: u.size });
    } else {
      grouped.set(key, {
        kind: "piece",
        label: `${getDesign(u.designId)!.name} — taille ${u.size}${u.earlyBird ? " (early bird)" : ""}`,
        unitAmount: u.unitAmount,
        quantity: 1,
        earlyBird: u.earlyBird,
        units: [{ designId: u.designId, size: u.size }],
      });
    }
  });
  lines.push(...grouped.values());

  const total = lines.reduce((sum, l) => sum + l.unitAmount * l.quantity, 0);
  return {
    lines,
    units: units.map((u, idx) => ({ ...u, pack: inPack.has(idx), allocatedAmount: allocated.get(idx)! })),
    total,
    pieces: units.length,
  };
}

/** Prix affichable « à partir de » pour le site (sans panier). */
export function currentUnitPrice(piecesSold: number, now: Date): { amount: number; earlyBird: boolean } {
  const earlyBird = now < earlyBirdEndsAt() && piecesSold < drop.earlyBird.maxPieces;
  return { amount: earlyBird ? drop.prices.earlyBird : drop.prices.regular, earlyBird };
}

export function formatEuros(cents: number): string {
  const euros = cents / 100;
  return Number.isInteger(euros)
    ? `${euros} €`
    : `${euros.toFixed(2).replace(".", ",")} €`;
}
