"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";

export async function unsubscribe(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (/^[a-f0-9]{64}$/.test(token)) {
    await db().from("waitlist").update({ unsubscribed_at: new Date().toISOString() }).eq("access_token", token).is("unsubscribed_at", null);
  }
  redirect("/desinscription?fait=1");
}
