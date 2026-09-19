import { isAdmin } from "@/lib/admin-auth";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/supabase";

export async function GET() {
  if (!(await isAdmin())) return new Response("Non autorisé", { status: 401 });
  const { data, error } = await db().from("waitlist").select("email, whatsapp, consent_at, access_sent_at, unsubscribed_at, created_at").order("created_at");
  if (error) return new Response("Erreur", { status: 500 });
  const csv = toCsv(
    ["E-mail", "WhatsApp", "Consentement le", "Accès envoyé le", "Désinscrit le", "Inscrit le"],
    (data ?? []).map((w) => [w.email, w.whatsapp, w.consent_at, w.access_sent_at, w.unsubscribed_at, w.created_at]),
  );
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="liste-attente-2tijen.csv"', "Cache-Control": "no-store" },
  });
}
