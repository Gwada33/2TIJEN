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
      <p role="status" className="rounded-2xl bg-sun p-5 font-bold text-night">
        C&apos;est noté ! {closed ? "On te prévient dès l'ouverture du drop 2." : "Tu recevras ton lien d'accès anticipé par e-mail."}
      </p>
    );
  }

  const field = "w-full rounded-2xl border-2 border-line bg-night px-4 py-3.5 text-base text-ink placeholder:text-muted/70 transition-colors focus:border-sun focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      <div>
        <label htmlFor="wl-email" className="mb-1 block text-sm font-bold">E-mail</label>
        <input id="wl-email" name="email" type="email" required autoComplete="email" inputMode="email" className={field} placeholder="ton@email.com" />
      </div>
      <div>
        <label htmlFor="wl-wa" className="mb-1 block text-sm font-bold">WhatsApp <span className="font-normal text-muted">(facultatif)</span></label>
        <input id="wl-wa" name="whatsapp" type="tel" autoComplete="tel" inputMode="tel" className={field} placeholder="+590 690 00 00 00" />
      </div>
      {/* Champ piège : invisible pour les humains. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>Ne pas remplir<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="flex items-start gap-3 text-sm leading-snug">
        <input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 shrink-0 accent-sun" />
        <span>
          J&apos;accepte que 2TIJEN utilise mon e-mail (et mon numéro s&apos;il est renseigné) pour m&apos;informer des drops et m&apos;envoyer mon accès anticipé.
          Je peux me désinscrire à tout moment. <a className="text-ink underline" href="/confidentialite">Politique de confidentialité</a>.
        </span>
      </label>
      <button type="submit" disabled={status === "loading"} className="btn btn-primary w-full sm:w-auto">
        {status === "loading" ? "Inscription…" : closed ? "Me prévenir pour le drop 2" : "Je m'inscris à la liste d'attente"}
      </button>
      {status === "error" && <p role="alert" className="font-bold text-orange">{message}</p>}
    </form>
  );
}
