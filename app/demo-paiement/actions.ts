"use server";

import { redirect } from "next/navigation";
import { CartError } from "@/lib/pricing";
import { demoPay } from "@/lib/demo-store";
import { demoMode } from "@/lib/stock";

/** Paiement SIMULÉ (mode démo uniquement) : aucun échange avec SumUp. */
export async function payDemo(formData: FormData) {
  if (!demoMode()) redirect("/");
  const id = String(formData.get("id") ?? "");
  try {
    demoPay(id);
  } catch (e) {
    if (e instanceof CartError) redirect(`/demo-paiement/${encodeURIComponent(id)}?erreur=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/merci?demo=${encodeURIComponent(id)}`);
}
