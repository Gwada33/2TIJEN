import { drop } from "@/config/drop";

/** Coordonnées saisies dans le panier (SumUp ne les demande pas sur sa page de paiement). */
export type CustomerInput = {
  email: string;
  name: string;
  phone: string | null;
  address: { line1: string; postal_code: string; city: string; country: string } | null;
};
export type CustomerResult = { ok: true; customer: CustomerInput } | { ok: false; error: string };

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Vérifie les coordonnées côté serveur ; l'adresse n'est exigée que pour l'envoi en métropole. */
export function parseCustomer(raw: unknown, delivery: "pickup" | "shipping"): CustomerResult {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const email = clean(c.email, 200).toLowerCase();
  const name = clean(c.name, 100);
  const phone = clean(c.phone, 30) || null;
  if (!EMAIL.test(email)) return { ok: false, error: "Renseigne une adresse e-mail valide." };
  if (name.length < 2) return { ok: false, error: "Renseigne ton nom." };
  if (phone && !/^[+\d][\d\s().-]{5,}$/.test(phone)) return { ok: false, error: "Numéro de téléphone invalide." };

  if (delivery !== "shipping") return { ok: true, customer: { email, name, phone, address: null } };

  const a = (c.address && typeof c.address === "object" ? c.address : {}) as Record<string, unknown>;
  const address = { line1: clean(a.line1, 200), postal_code: clean(a.postal_code, 12), city: clean(a.city, 100), country: drop.shipping.metropoleCountries[0] };
  if (address.line1.length < 3 || address.postal_code.length < 4 || address.city.length < 2) return { ok: false, error: "Renseigne ton adresse de livraison complète." };
  return { ok: true, customer: { email, name, phone, address } };
}
