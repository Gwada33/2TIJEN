import "server-only";
import { drop, SIZES, type Size } from "@/config/drop";
import type { CartDesign } from "@/components/CartProvider";
import { canPurchase, getNow, getPhase, isEarlyAccessWindow } from "@/lib/drop-state";
import { currentUnitPrice } from "@/lib/pricing";
import { fallbackStock, getStock, piecesTaken, type StockMap } from "@/lib/stock";
import { isValidAccessToken } from "@/lib/waitlist";

/** Tout ce qu'il faut pour afficher la boutique (accueil et pages produit) : état du drop, stock, prix. */
export async function loadStorefront(searchParams: { [key: string]: string | string[] | undefined }) {
  const now = getNow();
  const phase = getPhase(now);
  const token = typeof searchParams.acces === "string" ? searchParams.acces : null;

  // Accès anticipé : seulement dans les 24 h avant l'ouverture, avec un jeton valide.
  const earlyAccess = isEarlyAccessWindow(now) && (await isValidAccessToken(token));

  let stock: StockMap;
  let dbOk = true;
  try {
    stock = await getStock();
  } catch (e) {
    console.error("Stock indisponible", e);
    stock = fallbackStock();
    dbOk = false;
  }

  const mode = dbOk && canPurchase(now, earlyAccess) ? "open" : phase === "closed" ? "closed" : "before";
  const unit = currentUnitPrice(piecesTaken(stock), now);

  const designs: CartDesign[] = drop.designs.map((d) => ({
    id: d.id,
    name: d.name,
    madras: d.madras,
    images: d.images,
    alt: d.alt,
    available: Object.fromEntries(SIZES.map((s) => [s, stock[d.id]?.[s]?.available ?? 0])) as Record<Size, number>,
    stock: {
      total: SIZES.reduce((n, s) => n + (stock[d.id]?.[s]?.total ?? 0), 0),
      left: SIZES.reduce((n, s) => n + (stock[d.id]?.[s]?.available ?? 0), 0),
    },
  }));

  return { now, phase, mode: mode as "open" | "before" | "closed", token, earlyAccess, dbOk, unit, designs };
}
export type Storefront = Awaited<ReturnType<typeof loadStorefront>>;
