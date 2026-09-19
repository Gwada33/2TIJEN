import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { requireEnv } from "@/lib/env";

/**
 * Authentification admin minimale : un mot de passe (variable d'environnement)
 * et un cookie signé (HMAC), httpOnly, valable 12 h. Rien n'est stocké en base.
 */
const COOKIE = "admin_session";
const MAX_AGE_S = 12 * 3600;

const sign = (payload: string) => createHmac("sha256", requireEnv("ADMIN_SESSION_SECRET")).update(payload).digest("hex");

/** Comparaison en temps constant (évite de deviner le mot de passe par le temps de réponse). */
function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) return false; // pas de mot de passe configuré = admin fermé
  return safeEqual(input, expected);
}

export async function startSession() {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const payload = String(expires);
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: MAX_AGE_S,
  });
}

export async function endSession() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}

export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_SESSION_SECRET || !process.env.ADMIN_PASSWORD) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature || !safeEqual(signature, sign(expires))) return false;
  return Number(expires) > Date.now() / 1000;
}
