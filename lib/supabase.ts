import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * Client Supabase avec la clé « service role » (secrète).
 * Utilisable UNIQUEMENT côté serveur : le fichier est protégé par « server-only »
 * et la clé n'est jamais envoyée au navigateur.
 */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
