import { drop } from "@/config/drop";

/** État PUBLIC du drop : ce que voit un visiteur sans jeton. */
export type DropPhase = "before" | "open" | "closed";

const HOUR = 3_600_000;

export const opensAt = () => new Date(drop.opensAt);
export const closesAt = () => new Date(drop.closesAt);

/**
 * « Maintenant ». En développement uniquement, la variable NOW_OVERRIDE
 * (ex. 2026-10-13T10:00:00-04:00) permet de tester les 3 états sans attendre.
 * Elle est ignorée en production : impossible de tricher avec.
 */
export function getNow(): Date {
  const override = process.env.NOW_OVERRIDE;
  if (override && process.env.NODE_ENV !== "production") {
    const d = new Date(override);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function getPhase(now: Date): DropPhase {
  if (now < opensAt()) return "before";
  if (now < closesAt()) return "open";
  return "closed";
}

/** Début de la fenêtre d'accès anticipé (24 h avant l'ouverture). */
export function earlyAccessStart(): Date {
  return new Date(opensAt().getTime() - drop.earlyAccessHours * HOUR);
}

/** Vrai pendant les 24 h qui précèdent l'ouverture publique. */
export function isEarlyAccessWindow(now: Date): boolean {
  return now >= earlyAccessStart() && now < opensAt();
}

/**
 * Peut-on acheter ? Oui pendant la préco ouverte, ou pendant la fenêtre
 * d'accès anticipé si (et seulement si) le visiteur a un jeton valide.
 */
export function canPurchase(now: Date, hasValidEarlyToken: boolean): boolean {
  const phase = getPhase(now);
  if (phase === "open") return true;
  return phase === "before" && isEarlyAccessWindow(now) && hasValidEarlyToken;
}

/** Fin de la période early bird liée à la durée (48 h après l'ouverture). */
export function earlyBirdEndsAt(): Date {
  return new Date(opensAt().getTime() + drop.earlyBird.durationHours * HOUR);
}
