"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CART_STORAGE_KEY } from "@/components/CartProvider";

/** Vide le panier mémorisé : la commande est payée. */
export function ClearCart() {
  useEffect(() => {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      /* stockage indisponible */
    }
  }, []);
  return null;
}

/**
 * La confirmation de SumUp peut prendre quelques secondes : on recharge la page jusqu'à 6 fois,
 * en comptant les essais dans l'URL (paramètre « t ») pour que le serveur sache quand renoncer
 * et proposer autre chose qu'une attente infinie (voir app/merci/page.tsx).
 */
export function AutoRefresh({ every = 3000, times = 6 }: { every?: number; times?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    let n = Number(searchParams.get("t") ?? 0);
    const id = setInterval(() => {
      n += 1;
      const next = new URLSearchParams(searchParams.toString());
      next.set("t", String(n));
      router.replace(`${pathname}?${next.toString()}`);
      if (n >= times) clearInterval(id);
    }, every);
    return () => clearInterval(id);
    // searchParams n'est lu qu'au départ (n s'incrémente lui-même) : le rajouter en dépendance relancerait la boucle à chaque tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, pathname, every, times]);
  return null;
}

/** Numéro de pièce qui défile jusqu'à sa valeur (puis reste fixe). Le texte final est dans le HTML dès le départ. */
export function PieceNumber({ value, total, delay = 0 }: { value: number; total: number; delay?: number }) {
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (now: number) => {
      const p = Math.min(Math.max((now - t0) / 900, 0), 1);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
      else setShown(null);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, delay]);
  const pad = (n: number) => String(n).padStart(3, "0");
  return (
    <span aria-label={`Numéro ${value} sur ${total}`}>
      <span aria-hidden="true">{pad(shown ?? value)}</span>
      <span aria-hidden="true" className="text-muted"> / {pad(total)}</span>
    </span>
  );
}
