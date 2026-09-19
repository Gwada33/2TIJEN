import "server-only";
import { db } from "@/lib/supabase";
import { SIZES, type Size } from "@/config/drop";

export type StockCell = { total: number; sold: number; reserved: number; available: number };
export type StockMap = Record<string, Record<Size, StockCell>>;

/** Stock par design et par taille (disponible = total − vendu − réservé en cours). */
export async function getStock(): Promise<StockMap> {
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

/** Nombre de pièces déjà vendues ou réservées (sert à savoir si l'early bird court encore). */
export function piecesTaken(stock: StockMap): number {
  let n = 0;
  for (const design of Object.values(stock)) for (const c of Object.values(design)) n += c.sold + c.reserved;
  return n;
}
