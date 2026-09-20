import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { drop, getDesign } from "@/config/drop";
import { AutoRefresh, ClearCart, PieceNumber } from "@/components/MerciClient";
import { SiteFooter } from "@/components/SiteFooter";
import { demoOrder, demoTotalFor } from "@/lib/demo-store";
import { settleCheckout } from "@/lib/fulfil";
import { estimatedDelivery, formatDay, formatEuros } from "@/lib/format";
import { demoMode } from "@/lib/stock";
import { db } from "@/lib/supabase";

export const metadata: Metadata = { title: "Merci !", robots: { index: false } };

type Piece = { designId: string; size: string; number: number; total: number; unitAmount: number | null };
type Order = { pieces: Piece[]; discount: number; promoCode: string | null; total: number | null; shipping: number | null; delivery: "pickup" | "shipping" | null; email: string | null };

const CONFETTI_COLORS = ["#d7bc4b", "#b5549f", "#ece8df", "#285db2", "#2e9c2e", "#b8512c", "#40959b", "#f6dcea", "#e2443a", "#acdaed"];
const CONFETTI_SHAPES = [
  "polygon(6% 4%, 94% 0%, 100% 92%, 0% 100%)",
  "polygon(50% 0%, 100% 30%, 96% 100%, 4% 100%, 0% 30%)",
  "ellipse(50% 50% at 50% 50%)",
  "polygon(0% 8%, 100% 0%, 88% 100%, 10% 92%)",
];

export default async function Merci({ searchParams }: PageProps<"/merci">) {
  const { ref, demo } = await searchParams;
  const reservationId = typeof ref === "string" && /^[0-9a-f-]{36}$/.test(ref) ? ref : null;

  let order: Order | null = null;
  let simulation = false;

  // --- Démo (développement) ---
  const demoData = demoMode() && typeof demo === "string" ? demoOrder(demo) : undefined;
  if (demoData?.pieces) {
    simulation = true;
    order = {
      pieces: demoData.pieces.map((p) => ({ designId: p.designId, size: p.size, number: p.number, total: demoTotalFor(p.designId), unitAmount: p.unitAmount })),
      discount: demoData.discount,
      promoCode: demoData.promoCode,
      total: demoData.total,
      shipping: demoData.shipping,
      delivery: demoData.delivery,
      email: demoData.email,
    };
  } else if (reservationId && !demoMode()) {
    // --- Production : SumUp nous ramène ici. On vérifie le paiement auprès de SumUp (sans attendre sa notification) ---
    try {
      const { data: reservation } = await db().from("reservations").select("checkout_id").eq("id", reservationId).maybeSingle();
      if (reservation?.checkout_id) await settleCheckout(reservation.checkout_id);

      const { data } = await db()
        .from("orders")
        .select("amount_total, discount_amount, promo_code, shipping_amount, delivery_method, email, order_items(design_id, size, piece_number, unit_amount)")
        .eq("reservation_id", reservationId)
        .maybeSingle();
      const designs = await db().from("designs").select("id, total_pieces");
      const totals = new Map((designs.data ?? []).map((d) => [d.id, d.total_pieces as number]));
      if (data?.order_items?.length) {
        order = {
          pieces: data.order_items.map((i) => ({ designId: i.design_id, size: i.size, number: i.piece_number, total: totals.get(i.design_id) ?? 0, unitAmount: i.unit_amount })),
          discount: data.discount_amount ?? 0,
          promoCode: data.promo_code ?? null,
          total: data.amount_total,
          shipping: data.shipping_amount,
          delivery: data.delivery_method === "shipping" ? "shipping" : "pickup",
          email: data.email,
        };
      }
    } catch (e) {
      console.error("merci", e);
    }
  }

  const { from, to } = estimatedDelivery();
  const steps = [
    { title: "Commande confirmée", text: "Tes pièces sont numérotées.", done: true },
    { title: "Clôture de la préco", text: `Le ${formatDay(new Date(drop.closesAt))}.`, done: false },
    { title: "Fabrication", text: "Lancée à la clôture de la préco.", done: false },
    { title: "Livraison", text: `Entre le ${formatDay(from)} et le ${formatDay(to, true)}.`, done: false },
  ];

  return (
    <>
      {order && <ClearCart />}
      {order && <Confetti />}
      <main id="contenu" className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
        {simulation && (
          <p role="note" className="mb-10 rounded-2xl bg-sun p-3 text-center text-sm font-bold text-night">
            SIMULATION : achat de test, aucun vrai paiement ni e-mail.
          </p>
        )}

        <div className="text-center">
          <svg viewBox="0 0 52 52" className="mx-auto h-20 w-20" fill="none" aria-hidden="true">
            <circle className="check-circle" cx="26" cy="26" r="24" stroke="#ffd23f" strokeWidth="2.5" />
            <path className="check-path" d="M14.5 27.5l8 8 15-17" stroke="#ffd23f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="merci-in mt-6 font-heavy text-3xl uppercase tracking-wide sm:text-4xl" style={{ "--d": "0.5s" } as React.CSSProperties}>
            Merci !
          </h1>
          <p className="merci-in mt-3 text-muted" style={{ "--d": "0.65s" } as React.CSSProperties}>
            {order ? "Ta précommande est confirmée." : "On vérifie ton paiement."}
            {order?.email ? <> Un e-mail de confirmation part à <span className="text-ink">{order.email}</span>.</> : null}
          </p>
        </div>

        {order ? (
          <>
            <ul className="mt-12 space-y-4">
              {order.pieces.map((p, i) => {
                const d = getDesign(p.designId);
                if (!d) return null;
                return (
                  <li
                    key={`${p.designId}-${p.number}`}
                    className="merci-in overflow-hidden rounded-3xl border border-line bg-surface"
                    style={{ "--d": `${0.8 + i * 0.15}s` } as React.CSSProperties}
                  >
                    <div className="madras-chip h-1.5" style={{ "--madras-img": `url(${d.madras})` } as React.CSSProperties} aria-hidden="true" />
                    <div className="flex items-center gap-4 p-4 sm:gap-6 sm:p-5">
                      <div className="relative h-20 w-24 shrink-0 sm:h-24 sm:w-28">
                        <Image src={d.images.back} alt="" fill sizes="112px" className="object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-heavy text-xs uppercase tracking-wide sm:text-sm">{d.name}</p>
                        <p className="mt-1 text-sm text-muted">Taille {p.size}{p.unitAmount ? <span className="whitespace-nowrap"> · {formatEuros(p.unitAmount)}</span> : null}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted">Pièce n°</p>
                        <p className="mt-1 font-heavy text-lg tabular-nums sm:text-2xl">
                          <PieceNumber value={p.number} total={p.total} delay={800 + i * 150} />
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {order.total !== null && (
              <dl className="merci-in mt-6 space-y-2 rounded-3xl border border-line p-5 text-sm" style={{ "--d": "1.1s" } as React.CSSProperties}>
                {order.discount > 0 && <div className="flex justify-between gap-4"><dt className="text-muted">Code {order.promoCode}</dt><dd className="text-sun">−{formatEuros(order.discount)}</dd></div>}
                <div className="flex justify-between gap-4"><dt className="shrink-0 text-muted">Livraison</dt><dd className="text-right">{order.delivery === "shipping" ? drop.shipping.metropoleLabel : drop.shipping.pickupLabel}{order.shipping ? ` · ${formatEuros(order.shipping)}` : ""}</dd></div>
                <div className="flex justify-between border-t border-line pt-3 font-heavy text-base"><dt>Total payé</dt><dd>{formatEuros(order.total)}</dd></div>
              </dl>
            )}
          </>
        ) : (
          <div className="mt-12 rounded-3xl border border-line bg-surface p-6 text-center" role="status">
            <p className="font-heavy text-sm uppercase tracking-wide">Enregistrement de ta commande…</p>
            <p className="mt-2 text-sm text-muted">Tes numéros de pièces arrivent dans quelques secondes, et par e-mail.</p>
            {reservationId && <AutoRefresh />}
          </div>
        )}

        <section aria-labelledby="titre-suite" className="mt-14">
          <h2 id="titre-suite" className="font-heavy text-sm uppercase tracking-[0.2em]">Et maintenant ?</h2>
          <ol className="mt-6">
            {steps.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
                {i < steps.length - 1 && <span className="absolute left-[0.7rem] top-6 h-full w-px bg-line" aria-hidden="true" />}
                <span
                  className={`relative mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${s.done ? "border-sun bg-sun text-night" : "border-line bg-night text-muted"}`}
                  aria-hidden="true"
                >
                  {s.done ? "✓" : i + 1}
                </span>
                <div>
                  <p className="font-bold">{s.title}</p>
                  <p className="text-sm text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-10 rounded-3xl border border-line p-5 text-sm text-muted">
          Une question sur ta commande ? Réponds à l&apos;e-mail de confirmation, ou écris-nous sur{" "}
          <a className="text-ink underline" href={`https://wa.me/${drop.contact.whatsapp}`} rel="noopener noreferrer" target="_blank">WhatsApp</a> ou{" "}
          <a className="text-ink underline" href={drop.contact.instagram} rel="noopener noreferrer" target="_blank">Instagram</a>.
        </p>

        <div className="mt-10 text-center">
          <Link href="/" className="btn btn-primary !pr-2.5">
            Retour au site
            <span className="btn-disc" aria-hidden="true">→</span>
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** Confettis : petits papiers découpés qui tombent une fois. Décoratifs, coupés si « réduire les animations ». */
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 34 }, (_, i) => (
        <i
          key={i}
          style={
            {
              left: `${(i * 29 + 7) % 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              clipPath: CONFETTI_SHAPES[i % CONFETTI_SHAPES.length],
              width: `${0.55 + ((i * 7) % 5) * 0.12}rem`,
              height: `${0.8 + ((i * 3) % 5) * 0.14}rem`,
              "--d": `${((i * 13) % 12) * 0.12}s`,
              "--t": `${2.4 + ((i * 5) % 7) * 0.22}s`,
              "--rot": `${(i % 2 ? 1 : -1) * (240 + ((i * 37) % 300))}deg`,
              "--sway": `${(i % 2 ? 1 : -1) * (1 + ((i * 11) % 4))}rem`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
