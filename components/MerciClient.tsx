"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

/** La confirmation de SumUp peut prendre quelques secondes : on recharge la page jusqu'à 6 fois. */
export function AutoRefresh({ every = 3000, times = 6 }: { every?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      router.refresh();
      if (++n >= times) clearInterval(id);
    }, every);
    return () => clearInterval(id);
  }, [router, every, times]);
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
