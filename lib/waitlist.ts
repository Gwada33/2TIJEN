import "server-only";
import { db } from "@/lib/supabase";
import { demoMode } from "@/lib/stock";

/** Un jeton d'accès anticipé est valide s'il appartient à un inscrit non désinscrit. */
export async function isValidAccessToken(token: string | null | undefined): Promise<boolean> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  if (demoMode()) return token === "a".repeat(64); // jeton de démonstration (dev uniquement)
  try {
    const { data, error } = await db()
      .from("waitlist")
      .select("id")
      .eq("access_token", token)
      .is("unsubscribed_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return !!data;
  } catch (e) {
    console.error("isValidAccessToken", e);
    return false;
  }
}
