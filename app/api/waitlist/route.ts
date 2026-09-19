import type { NextRequest } from "next/server";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { db } from "@/lib/supabase";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/** Inscription à la liste d'attente : validation, rate limit, consentement, sans doublon. */
export async function POST(request: NextRequest) {
  if (!(await allowRequest(`waitlist:${clientIp(request)}`, 600, 5))) {
    return Response.json({ error: "Trop de tentatives, réessaie plus tard." }, { status: 429 });
  }

  let body: { email?: unknown; whatsapp?: unknown; consent?: unknown; website?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Champ piège « website » : invisible pour un humain, rempli par les robots.
  if (typeof body.website === "string" && body.website !== "") return Response.json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) {
    return Response.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (body.consent !== true) {
    return Response.json({ error: "Le consentement est nécessaire pour t'inscrire." }, { status: 400 });
  }

  let whatsapp: string | null = null;
  if (typeof body.whatsapp === "string" && body.whatsapp.trim() !== "") {
    const cleaned = body.whatsapp.replace(/[\s.\-()]/g, "");
    if (!/^\+?\d{8,15}$/.test(cleaned)) {
      return Response.json({ error: "Numéro WhatsApp invalide." }, { status: 400 });
    }
    whatsapp = cleaned;
  }

  const { error } = await db().rpc("waitlist_join", { p_email: email, p_whatsapp: whatsapp });
  if (error) {
    console.error("waitlist_join", error.message);
    return Response.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }
  // Même réponse que l'e-mail soit nouveau ou déjà inscrit (pas de fuite d'information).
  return Response.json({ ok: true });
}
