"use client";

import { useEffect, useState } from "react";

/**
 * Titre en lettres « découpées » façon ransom note, repris des dos des t-shirts.
 * À l'arrivée, chaque lettre change de police et de couleur en boucle, puis se fixe
 * sur son style final l'une après l'autre (de gauche à droite). Si la personne a
 * demandé « réduire les animations », le titre s'affiche directement fini.
 *
 * Le texte lisible est porté par aria-label ; les lettres décoratives sont masquées
 * aux lecteurs d'écran. Chaque lettre garde la largeur de son style final (lettre
 * invisible qui sert de gabarit) : la mise en page ne bouge pas pendant l'animation.
 */
type Font = { family: string; weight: number; italic?: boolean };
const SLAB: Font = { family: "var(--font-slab)", weight: 400 };
const HEAVY: Font = { family: "var(--font-heavy)", weight: 800 };
// Polices « système » : servent seulement pendant l'animation, rien à télécharger.
const EXTRA_FONTS: Font[] = [
  { family: "Georgia, serif", weight: 700, italic: true },
  { family: "ui-monospace, Menlo, Consolas, monospace", weight: 800 },
  { family: "Impact, 'Arial Narrow', sans-serif", weight: 400 },
  { family: "var(--font-body), system-ui, sans-serif", weight: 900 },
  { family: "'Times New Roman', serif", weight: 700 },
];
const SHUFFLE_FONTS = [SLAB, HEAVY, ...EXTRA_FONTS];

const TILES = [
  { bg: "#d7bc4b", fg: "#0a0a0b", font: SLAB },
  { bg: "#b5549f", fg: "#ffffff", font: HEAVY },
  { bg: "#ece8df", fg: "#0a0a0b", font: SLAB },
  { bg: "#285db2", fg: "#ffffff", font: HEAVY },
  { bg: "#2e9c2e", fg: "#0a0a0b", font: SLAB },
  { bg: "#b8512c", fg: "#ffffff", font: HEAVY },
  { bg: "#40959b", fg: "#ffffff", font: SLAB },
  { bg: "#f6dcea", fg: "#8f3a7d", font: HEAVY },
] as const;
const ROTATIONS = [-3, 2, -1.5, 3, -2.5, 1.5, -1, 2.5];

const FRAME_MS = 80; // vitesse du défilement des styles
const START_MS = 700; // la première lettre se fixe après 0,7 s
const STEP_MS = 80; // puis une lettre toutes les 80 ms

/** Pseudo-aléatoire déterministe (même résultat côté serveur et navigateur). */
const pick = (frame: number, i: number, mod: number) => ((frame * 2654435761 + i * 40503 + i * i * 97) >>> 0) % mod;

const fontStyle = (f: Font): React.CSSProperties => ({
  fontFamily: f.family,
  fontWeight: f.weight,
  fontStyle: f.italic ? "italic" : "normal",
});

export function Ransom({ text, className = "" }: { text: string; className?: string }) {
  const letters = [...text.replace(/ /g, "")].length;
  const doneAt = START_MS + letters * STEP_MS;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setElapsed(Infinity);
      return;
    }
    const t0 = performance.now();
    const id = setInterval(() => {
      const t = performance.now() - t0;
      setElapsed(t >= doneAt ? Infinity : t);
      if (t >= doneAt) clearInterval(id);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [doneAt]);

  const frame = Number.isFinite(elapsed) ? Math.floor(elapsed / FRAME_MS) : 0;
  const words = text.split(" ");
  let i = 0;
  return (
    <span role="img" aria-label={text} className={`inline-flex flex-col items-start gap-1.5 ${className}`}>
      {words.map((word, w) => (
        <span key={w} aria-hidden="true" className="inline-flex flex-nowrap gap-[3px] whitespace-nowrap">
          {[...word].map((ch) => {
            const index = i;
            i += 1;
            const final = TILES[(index * 3 + 1) % TILES.length];
            const rot = ROTATIONS[(index * 5 + 2) % ROTATIONS.length];
            const settled = elapsed >= START_MS + index * STEP_MS;
            const bg = settled ? final.bg : TILES[pick(frame, index, TILES.length)].bg;
            const fg = settled ? final.fg : TILES[pick(frame + 3, index, TILES.length)].fg;
            const font = settled ? final.font : SHUFFLE_FONTS[pick(frame + 7, index, SHUFFLE_FONTS.length)];
            return (
              <span
                key={index}
                className="ransom-tile relative inline-block"
                style={{ ["--r" as string]: `${rot}deg`, ["--i" as string]: index }}
              >
                {/* gabarit invisible : largeur du style final */}
                <span className="invisible inline-block px-[0.18em] py-[0.02em] leading-[1.1]" style={fontStyle(final.font)}>
                  {ch}
                </span>
                <span
                  className={`absolute inset-0 grid place-items-center overflow-hidden rounded-[3px] leading-[1.1] shadow-[0_3px_0_rgb(0_0_0/0.55)] ${settled ? "ransom-pop" : ""}`}
                  style={{ background: bg, color: fg, ...fontStyle(font) }}
                >
                  {ch}
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
