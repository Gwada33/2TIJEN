import "server-only";
import { db } from "@/lib/supabase";
import { drop, SIZES, type Size } from "@/config/drop";

export type StockCell = { total: number; sold: number; reserved: number; available: number };
export type StockMap = Record<string, Record<Size, StockCell>>;

/**
 * Mode démo, DÉVELOPPEMENT UNIQUEMENT (DEMO_NO_DB=1) : permet de voir le site et
 * ses états sans base de données. Ignoré en production.
 */
export const demoMode = () => process.env.NODE_ENV !== "production" && process.env.DEMO_NO_DB === "1";

/** Stock initial de la config (mode démo, ou repli si la base est injoignable). */
export function fallbackStock(): StockMap {
  return Object.fromEntries(
    drop.designs.map((d) => [
      d.id,
      Object.fromEntries(SIZES.map((s) => [s, { total: d.stock[s], sold: 0, reserved: 0, available: d.stock[s] }])),
    ]),
  ) as StockMap;
}

/** Stock par design et par taille (disponible = total − vendu − réservé en cours). */
export async function getStock(): Promise<StockMap> {
  if (demoMode()) return fallbackStock();
  const { data, error } = await db().from("stock_status").select("*");
  if (error) throw new Error(`stock_status : ${error.message}`);
  const map: StockMap = {};
  for (const row of data ?? []) {
    map[row.design_id] ??= Object.fromEntries(
      SIZES.map((s) => [s, { total: 0, sold: 0, reserved: 0, available: 0 }]),
    ) as Record<Size, StockCell>;
    map[row.design_id][row.size as Size] = {
      total: row.total,
      sold: row.sold,
      reserved: row.reserved,
      available: row.available,
    };
  }
  return map;
}

/**
 * Nombre de pièces déjà vendues ou réservées DANS LE DROP EN COURS (designs de la config).
 * Sert à savoir si l'early bird court encore ; un futur drop 2 repart donc de zéro.
 */
export function piecesTaken(stock: StockMap): number {
  let n = 0;
  for (const d of drop.designs) for (const c of Object.values(stock[d.id] ?? {})) n += c.sold + c.reserved;
  return n;
}
