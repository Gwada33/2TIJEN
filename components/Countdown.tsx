"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Compte à rebours. L'heure de référence est celle du SERVEUR (serverNow) :
 * un téléphone mal réglé n'affiche donc pas une fausse date. À zéro, la page
 * se rafraîchit toute seule pour changer d'état (ouverture / clôture).
 */
export function Countdown({ target, serverNow, label }: { target: string; serverNow: number; label: string }) {
  const router = useRouter();
  const targetMs = new Date(target).getTime();
  const [remaining, setRemaining] = useState(Math.max(targetMs - serverNow, 0));

  useEffect(() => {
    const offset = serverNow - Date.now();
    let refreshed = false;
    const tick = () => {
      const left = Math.max(targetMs - (Date.now() + offset), 0);
      setRemaining(left);
      if (left === 0 && !refreshed) {
        refreshed = true;
        router.refresh();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs, serverNow, router]);

  const s = Math.floor(remaining / 1000);
  const parts = [
    { v: Math.floor(s / 86400), l: "jours" },
    { v: Math.floor((s % 86400) / 3600), l: "heures" },
    { v: Math.floor((s % 3600) / 60), l: "min" },
    { v: s % 60, l: "sec" },
  ];

  return (
    <div role="timer" aria-label={`${label} : ${parts.map((p) => `${p.v} ${p.l}`).join(" ")}`}>
      <p className="mb-2 text-sm font-bold uppercase tracking-widest text-pink-deep">{label}</p>
      <div className="flex gap-2 sm:gap-3" aria-hidden="true">
        {parts.map((p) => (
          <div key={p.l} className="min-w-[4.25rem] rounded-2xl bg-ink px-2 py-3 text-center text-white sm:min-w-[5.5rem]">
            <div className="font-black text-3xl tabular-nums leading-none sm:text-4xl">{String(p.v).padStart(2, "0")}</div>
            <div className="mt-1 text-[0.7rem] uppercase tracking-wider text-white/80">{p.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
