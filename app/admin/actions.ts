"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, endSession, isAdmin, startSession } from "@/lib/admin-auth";
import { sendEarlyAccess } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { opensAt } from "@/lib/drop-state";
import { allowRequest } from "@/lib/rate-limit";
import { refundTransaction } from "@/lib/sumup";
import { db } from "@/lib/supabase";

export async function login(_prev: { error: string } | null, formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // 10 essais par 15 minutes et par adresse IP : bloque les tentatives en série.
  if (!(await allowRequest(`admin-login:${ip}`, 900, 10))) return { error: "Trop d'essais. Réessaie dans 15 minutes." };
  if (!checkPassword(String(formData.get("password") ?? ""))) return { error: "Mot de passe incorrect." };
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin");
}

/** Envoie le lien d'accès anticipé aux inscrits qui ne l'ont pas encore reçu (100 max par clic). */
export async function sendEarlyAccessLinks(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const { data, error } = await db()
    .from("waitlist")
    .select("id, email, access_token")
    .is("unsubscribed_at", null)
    .is("access_sent_at", null)
    .limit(100);
  if (error) throw new Error(error.message);

  const label = formatDateTime(opensAt());
  for (const w of data ?? []) {
    try {
      await sendEarlyAccess(w.email, w.access_token, label);
      await db().from("waitlist").update({ access_sent_at: new Date().toISOString() }).eq("id", w.id);
    } catch (e) {
      console.error("sendEarlyAccess", w.email, e);
    }
  }
  revalidatePath("/admin");
}

/**
 * Rembourse manuellement une commande « à rembourser » (le remboursement automatique a échoué).
 * Ne fait rien si la commande n'a pas de transaction (paiement jamais confirmé) : à traiter à la main.
 */
export async function refundOrder(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const orderId = String(formData.get("orderId") ?? "");
  const transactionId = String(formData.get("transactionId") ?? "");
  if (!orderId || !transactionId) return;
  try {
    await refundTransaction(transactionId);
  } catch (e) {
    console.error("refundOrder", orderId, e);
    redirect(`/admin?refundError=${encodeURIComponent(orderId)}`);
  }
  const { error } = await db().from("orders").update({ status: "refunded" }).eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
