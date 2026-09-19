import "server-only";
import { drop, SIZES } from "@/config/drop";
import { earlyBirdEndsAt, getNow } from "@/lib/drop-state";
import { db } from "@/lib/supabase";

export type AdminOrder = {
  id: string;
  drop_name: string | null;
  created_at: string;
  name: string | null;
  email: string;
  phone: string | null;
  delivery_method: string | null;
  shipping_address: Record<string, string | null> | null;
  amount_total: number;
  status: string;
  order_items: { design_id: string; size: string; piece_number: number; unit_amount: number; early_bird: boolean; pack: boolean }[];
};

export async function loadAdminData() {
  const [orders, designs, stock, waitlist] = await Promise.all([
    db().from("orders").select("*, order_items(design_id, size, piece_number, unit_amount, early_bird, pack)").order("created_at", { ascending: false }),
    db().from("designs").select("*"),
    db().from("stock_status").select("*"),
    db().from("waitlist").select("id, unsubscribed_at, access_sent_at"),
  ]);
  for (const r of [orders, designs, stock, waitlist]) if (r.error) throw new Error(r.error.message);

  const allOrders = (orders.data ?? []) as AdminOrder[];
  // Les compteurs ne portent que sur le drop en cours (la liste, elle, montre tout).
  const paid = allOrders.filter((o) => o.status === "paid" && o.drop_name === drop.name);

  // Par design : nombre de commandes qui le contiennent et de pièces vendues.
  const perDesign = drop.designs.map((d) => {
    const inOrders = paid.filter((o) => o.order_items.some((i) => i.design_id === d.id));
    const pieces = paid.reduce((n, o) => n + o.order_items.filter((i) => i.design_id === d.id).length, 0);
    return {
      id: d.id,
      name: d.name,
      orders: inOrders.length,
      pieces,
      ordersOk: inOrders.length >= drop.production.minOrdersPerDesign,
    };
  });

  const pieces = paid.flatMap((o) => o.order_items);
  const earlyUsed = pieces.filter((i) => i.early_bird).length;

  const stockRows = (stock.data ?? []) as { design_id: string; size: string; total: number; sold: number; reserved: number; available: number }[];
  const stockByDesign = drop.designs.map((d) => ({
    id: d.id,
    name: d.name,
    sizes: SIZES.map((s) => stockRows.find((r) => r.design_id === d.id && r.size === s) ?? { design_id: d.id, size: s, total: 0, sold: 0, reserved: 0, available: 0 }),
  }));

  const wl = waitlist.data ?? [];
  const now = getNow();
  return {
    orders: allOrders,
    perDesign,
    totalOrders: paid.length,
    thresholdReached: paid.length >= drop.production.minOrders && perDesign.every((d) => d.ordersOk),
    stockByDesign,
    earlyBird: {
      used: earlyUsed,
      max: drop.earlyBird.maxPieces,
      active: now < earlyBirdEndsAt() && pieces.length < drop.earlyBird.maxPieces,
    },
    waitlist: {
      active: wl.filter((w) => !w.unsubscribed_at).length,
      unsubscribed: wl.filter((w) => w.unsubscribed_at).length,
      accessSent: wl.filter((w) => w.access_sent_at && !w.unsubscribed_at).length,
    },
    needsRefund: allOrders.filter((o) => o.status === "needs_refund").length,
  };
}

export const formatAddress = (a: AdminOrder["shipping_address"]) =>
  a ? [a.line1, a.line2, a.postal_code, a.city, a.country].filter(Boolean).join(", ") : "";
