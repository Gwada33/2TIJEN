import "server-only";
import { db } from "@/lib/supabase";

/** Adresse IP du visiteur (Vercel la fournit dans x-forwarded-for). */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * Limite le nombre de requêtes par clé et par fenêtre, en base de données
 * (fonctionne même quand Vercel lance plusieurs instances du serveur).
 * Retourne false si la limite est dépassée. En cas d'erreur de la base on
 * laisse passer plutôt que de bloquer les vrais clients.
 */
export async function allowRequest(key: string, windowSeconds: number, max: number): Promise<boolean> {
  const { data, error } = await db().rpc("rate_limit_hit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) {
    console.error("rate_limit_hit", error.message);
    return true;
  }
  return data === true;
}
