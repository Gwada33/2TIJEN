"use client";

import { useState } from "react";

export function WaitlistForm({ closed }: { closed: boolean }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          whatsapp: form.get("whatsapp"),
          consent: form.get("consent") === "on",
          website: form.get("website"), // champ piège anti-robots
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur, réessaie.");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Erreur, réessaie.");
    }
  }

  if (status === "done") {
    return (
      <p role="status" className="rounded-2xl bg-sun p-4 font-bold text-night">
        C&apos;est noté ! {closed ? "On te prévient pour le drop 2." : "Ton lien d'accès arrive par e-mail."}
      </p>
    );
  }

  const field = "w-full rounded-full border border-line bg-night px-5 py-3.5 text-base text-ink placeholder:text-muted/70 transition-colors focus:border-sun focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      <div>
        <label htmlFor="wl-email" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-muted">E-mail</label>
        <input id="wl-email" name="email" type="email" required autoComplete="email" inputMode="email" className={field} placeholder="ton@email.com" />
      </div>
      <div>
        <label htmlFor="wl-wa" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.15em] text-muted">WhatsApp (facultatif)</label>
        <input id="wl-wa" name="whatsapp" type="tel" autoComplete="tel" inputMode="tel" className={field} placeholder="+590 690 00 00 00" />
      </div>
      {/* Champ piège : invisible pour les humains. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>Ne pas remplir<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="flex items-start gap-3 text-xs leading-snug text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 shrink-0 accent-sun" />
        <span>
          J&apos;accepte que 2TIJEN utilise mon e-mail (et mon numéro s&apos;il est renseigné) pour m&apos;informer des drops et m&apos;envoyer mon accès anticipé. Désinscription possible à tout moment.
          <a className="text-ink underline" href="/confidentialite"> Confidentialité</a>.
        </span>
      </label>
      <button type="submit" disabled={status === "loading"} className="btn btn-primary w-full">
        {status === "loading" ? "Inscription…" : closed ? "Me prévenir" : "Je m'inscris"}
      </button>
      {status === "error" && <p role="alert" className="font-bold text-orange">{message}</p>}
    </form>
  );
}
