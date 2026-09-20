import "server-only";
import { drop } from "@/config/drop";
import { requireEnv } from "@/lib/env";

/**
 * Paiement SumUp : page de paiement hébergée par SumUp (cartes, Apple Pay, Google Pay).
 * Documentation : https://developer.sumup.com/online-payments/checkouts/hosted-checkout
 * Le site ne calcule aucun prix ici : il transmet un montant déjà calculé par le serveur.
 */

const API = "https://api.sumup.com";

/** Centimes → euros décimaux (SumUp attend un montant en unité principale). */
export const centsToAmount = (cents: number) => Math.round(cents) / 100;
/** Euros décimaux → centimes. */
export const amountToCents = (amount: number) => Math.round(amount * 100);

/** Corps de la requête « créer un paiement ». Fonction pure, testée dans tests/sumup.test.ts. */
export function buildCheckoutBody(o: {
  merchantCode: string;
  /** Identifiant de la réservation : retrouvé à la confirmation du paiement (64 caractères maximum). */
  reference: string;
  /** Montant TOTAL à payer, en centimes (remise et livraison comprises). */
  amountCents: number;
  redirectUrl: string;
  returnUrl?: string;
  validUntil: Date;
}) {
  if (!Number.isInteger(o.amountCents) || o.amountCents <= 0) throw new Error(`Montant invalide : ${o.amountCents}`);
  return {
    merchant_code: o.merchantCode,
    checkout_reference: o.reference,
    amount: centsToAmount(o.amountCents),
    currency: "EUR",
    description: `${drop.brand} — ${drop.name}`.slice(0, 100),
    redirect_url: o.redirectUrl,
    ...(o.returnUrl ? { return_url: o.returnUrl } : {}),
    valid_until: o.validUntil.toISOString(),
    hosted_checkout: { enabled: true },
  };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${requireEnv("SUMUP_API_KEY")}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SumUp ${init?.method ?? "GET"} ${path} : HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export type SumupCheckout = {
  id: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  /** En euros décimaux. */
  amount: number;
  currency: string;
  checkout_reference: string;
  transactions?: { id: string; status: string; amount: number }[];
  hosted_checkout_url?: string;
};

/** Crée le paiement et renvoie l'adresse de la page de paiement SumUp. */
export async function createCheckout(o: Omit<Parameters<typeof buildCheckoutBody>[0], "merchantCode">): Promise<{ id: string; url: string }> {
  const created = await call<SumupCheckout>("/v0.1/checkouts", {
    method: "POST",
    body: JSON.stringify(buildCheckoutBody({ ...o, merchantCode: requireEnv("SUMUP_MERCHANT_CODE") })),
  });
  if (!created.hosted_checkout_url) throw new Error("SumUp n'a pas renvoyé de page de paiement (paiement hébergé activé ?)");
  return { id: created.id, url: created.hosted_checkout_url };
}

/** Lit l'état réel d'un paiement auprès de SumUp : c'est la seule source de vérité (les notifications ne sont pas signées). */
export const getCheckout = (id: string) => call<SumupCheckout>(`/v0.1/checkouts/${encodeURIComponent(id)}`);

/** Rembourse intégralement une transaction. */
export const refundTransaction = (transactionId: string) =>
  call(`/v1.0/merchants/${encodeURIComponent(requireEnv("SUMUP_MERCHANT_CODE"))}/payments/${encodeURIComponent(transactionId)}/refunds`, { method: "POST", body: "{}" });
