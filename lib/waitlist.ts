import "server-only";
import { db } from "@/lib/supabase";

/** Un jeton d'accès anticipé est valide s'il appartient à un inscrit non désinscrit. */
export async function isValidAccessToken(token: string | null | undefined): Promise<boolean> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const { data, error } = await db()
    .from("waitlist")
    .select("id")
    .eq("access_token", token)
    .is("unsubscribed_at", null)
    .maybeSingle();
  if (error) {
    console.error("isValidAccessToken", error.message);
    return false;
  }
  return !!data;
}
