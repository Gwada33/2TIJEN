import { drop } from "@/config/drop";

const TZ = "America/Guadeloupe";

/** « lundi 12 octobre à 18 h 00 » (heure de la Guadeloupe). */
export function formatDateTime(d: Date): string {
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
    .format(d)
    .replace(":", " h ");
  return `${date} à ${time}`;
}

export function formatDay(d: Date, withYear = false): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(d);
}

/** Fenêtre de livraison estimée : 4 à 6 semaines après la clôture. */
export function estimatedDelivery(): { from: Date; to: Date } {
  const close = new Date(drop.closesAt).getTime();
  const week = 7 * 24 * 3_600_000;
  return { from: new Date(close + 4 * week), to: new Date(close + 6 * week) };
}

export function formatEuros(cents: number): string {
  const euros = cents / 100;
  return Number.isInteger(euros)
    ? `${euros} €`
    : `${euros.toFixed(2).replace(".", ",")} €`;
}
