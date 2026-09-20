import { beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

/**
 * Teste les règles critiques directement sur le schéma SQL, avec une vraie base
 * PostgreSQL embarquée (PGlite) : réservation, survente, idempotence, numéros.
 */
const schema = readFileSync("supabase/schema.sql", "utf8");
let db: PGlite;

async function fresh() {
  db = new PGlite();
  // Sur Supabase ces rôles existent déjà ; on les crée pour que le schéma s'exécute.
  await db.exec("create role anon; create role authenticated;");
  await db.exec(schema);
  await db.exec(`
    insert into designs (id, name, total_pieces) values ('a','A',3), ('b','B',3);
    insert into stock (design_id, size, total) values
      ('a','M',1), ('a','L',2), ('b','M',1), ('b','L',2);
  `);
}

const reserve = (items: unknown[]) =>
  db.query<{ reservation_id: string; item_ids: string[]; pieces_before: number }>(
    "select * from reserve_stock($1::jsonb, 15, $2::text[])",
    [JSON.stringify(items), ["a", "b"]],
  );

const complete = (session: string, reservation: string) =>
  db.query<{ complete_order: { status: string; items?: { piece_number: number }[] } }>(
    `select complete_order($1, 'pi_1', $2::uuid, 'Drop 1', 'a@b.fr', 'Test', null, 'pickup', null, 3500, 0)`,
    [session, reservation],
  );

const available = async (d: string, s: string) =>
  (await db.query<{ available: number }>("select available from stock_status where design_id=$1 and size=$2", [d, s]))
    .rows[0].available;

beforeEach(fresh);

describe("réservation de stock", () => {
  it("la dernière pièce ne peut être réservée qu'une seule fois", async () => {
    await reserve([{ design_id: "a", size: "M", qty: 1 }]);
    await expect(reserve([{ design_id: "a", size: "M", qty: 1 }])).rejects.toThrow(/SOLD_OUT:a:M/);
    expect(await available("a", "M")).toBe(0);
  });

  it("refuse une quantité supérieure au stock, sans rien réserver", async () => {
    await expect(
      reserve([{ design_id: "a", size: "L", qty: 2 }, { design_id: "a", size: "M", qty: 2 }]),
    ).rejects.toThrow(/SOLD_OUT/);
    expect(await available("a", "L")).toBe(2);
  });

  it("une réservation expirée libère le stock", async () => {
    await reserve([{ design_id: "a", size: "M", qty: 1 }]);
    await db.exec("update reservations set expires_at = now() - interval '1 minute'");
    expect(await available("a", "M")).toBe(1);
  });

  it("une réservation libérée (paiement refusé) rend le stock", async () => {
    const r = await reserve([{ design_id: "a", size: "M", qty: 1 }]);
    await db.query("select release_reservation($1::uuid)", [r.rows[0].reservation_id]);
    expect(await available("a", "M")).toBe(1);
  });

  it("compte les pièces déjà réservées (pour l'early bird)", async () => {
    await reserve([{ design_id: "a", size: "L", qty: 2 }]);
    const r = await reserve([{ design_id: "b", size: "L", qty: 1 }]);
    expect(r.rows[0].pieces_before).toBe(2);
  });
});

describe("commande (webhook)", () => {
  it("crée la commande, numérote les pièces, décrémente le stock", async () => {
    const r = await reserve([{ design_id: "a", size: "L", qty: 2 }]);
    const res = (await complete("cs_1", r.rows[0].reservation_id)).rows[0].complete_order;
    expect(res.status).toBe("created");
    expect(res.items!.map((i) => i.piece_number)).toEqual([1, 2]);
    const s = await db.query<{ sold: number }>("select sold from stock where design_id='a' and size='L'");
    expect(s.rows[0].sold).toBe(2);
  });

  it("est idempotent : le même événement rejoué ne crée pas une 2e commande", async () => {
    const r = await reserve([{ design_id: "a", size: "L", qty: 1 }]);
    await complete("cs_1", r.rows[0].reservation_id);
    const again = (await complete("cs_1", r.rows[0].reservation_id)).rows[0].complete_order;
    expect(again.status).toBe("duplicate");
    const n = await db.query<{ n: number }>("select count(*)::int n from orders");
    const p = await db.query<{ n: number }>("select count(*)::int n from order_items");
    const sold = await db.query<{ sold: number }>("select sold from stock where design_id='a' and size='L'");
    expect([n.rows[0].n, p.rows[0].n, sold.rows[0].sold]).toEqual([1, 1, 1]);
  });

  it("les numéros continuent d'une commande à l'autre", async () => {
    const r1 = await reserve([{ design_id: "a", size: "L", qty: 1 }]);
    const r2 = await reserve([{ design_id: "a", size: "L", qty: 1 }]);
    await complete("cs_1", r1.rows[0].reservation_id);
    const res = (await complete("cs_2", r2.rows[0].reservation_id)).rows[0].complete_order;
    expect(res.items![0].piece_number).toBe(2);
  });

  it("paiement tardif après expiration + stock pris par un autre : commande « à rembourser »", async () => {
    const slow = await reserve([{ design_id: "a", size: "M", qty: 1 }]);
    await db.exec("update reservations set expires_at = now() - interval '1 minute'");
    const fast = await reserve([{ design_id: "a", size: "M", qty: 1 }]);
    await complete("cs_fast", fast.rows[0].reservation_id);
    const res = (await complete("cs_slow", slow.rows[0].reservation_id)).rows[0].complete_order;
    expect(res.status).toBe("oversold");
    const sold = await db.query<{ sold: number }>("select sold from stock where design_id='a' and size='M'");
    expect(sold.rows[0].sold).toBe(1);
    const o = await db.query<{ status: string }>("select status from orders where checkout_id='cs_slow'");
    expect(o.rows[0].status).toBe("needs_refund");
  });

  it("paiement tardif après expiration mais stock toujours libre : commande normale", async () => {
    const slow = await reserve([{ design_id: "a", size: "M", qty: 1 }]);
    await db.exec("update reservations set expires_at = now() - interval '1 minute'");
    const res = (await complete("cs_slow", slow.rows[0].reservation_id)).rows[0].complete_order;
    expect(res.status).toBe("created");
  });
});

describe("liste d'attente et limitation de débit", () => {
  it("pas de doublon, e-mail normalisé, réinscription possible", async () => {
    await db.query("select waitlist_join($1, null)", ["Test@Mail.fr"]);
    await db.query("select waitlist_join($1, '0690')", ["test@mail.fr"]);
    const w = await db.query<{ n: number }>("select count(*)::int n from waitlist");
    expect(w.rows[0].n).toBe(1);
    await db.exec("update waitlist set unsubscribed_at = now()");
    await db.query("select waitlist_join($1, null)", ["test@mail.fr"]);
    const u = await db.query<{ unsubscribed_at: string | null }>("select unsubscribed_at from waitlist");
    expect(u.rows[0].unsubscribed_at).toBeNull();
  });

  it("rate limit : bloque au-delà du maximum", async () => {
    const hits: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      hits.push((await db.query<{ ok: boolean }>("select rate_limit_hit('ip1', 60, 3) ok")).rows[0].ok);
    }
    expect(hits).toEqual([true, true, true, false]);
  });
});
