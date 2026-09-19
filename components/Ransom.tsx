"use client";

import { useEffect, useState } from "react";

/**
 * Titre en lettres « découpées » façon ransom note, comme sur les t-shirts.
 *
 * Chaque lettre est un morceau de papier différent : forme découpée au hasard (ciseaux,
 * flèche, ovale, coins coupés…), police, couleur, bordure fine (contour blanc ou double
 * filet), casse et angle. À l'arrivée, tout change en boucle, puis chaque lettre se fixe
 * sur un style tiré au hasard, de gauche à droite. Le résultat est différent à chaque visite.
 * Si la personne a demandé « réduire les animations », le titre s'affiche directement fini.
 *
 * Le texte lisible est porté par aria-label ; les lettres décoratives sont masquées aux
 * lecteurs d'écran. Chaque lettre occupe un cadre de taille fixe : la mise en page ne bouge pas.
 */

type Font = { family: string; weight: number; italic?: boolean; size: number };
const FONTS: Font[] = [
  { family: "var(--font-slab)", weight: 400, size: 0.95 },
  { family: "var(--font-heavy)", weight: 800, size: 0.8 },
  { family: "Georgia, serif", weight: 700, italic: true, size: 1 },
  { family: "ui-monospace, Menlo, Consolas, monospace", weight: 800, size: 0.9 },
  { family: "Impact, 'Arial Narrow', sans-serif", weight: 400, size: 1.08 },
  { family: "var(--font-body), system-ui, sans-serif", weight: 900, size: 0.95 },
  { family: "'Times New Roman', Times, serif", weight: 700, size: 1.05 },
  { family: "'Courier New', Courier, monospace", weight: 700, size: 0.95 },
];

// Couleurs des papiers, tirées des t-shirts.
const PAPERS = [
  "#d7bc4b", "#b5549f", "#ece8df", "#285db2", "#2e9c2e", "#b8512c", "#40959b",
  "#f6dcea", "#e2443a", "#acdaed", "#7b3fa0", "#f2a33a", "#141416", "#ffffff",
];
const INKS = ["#0a0a0b", "#ffffff", "#ece8df", "#d7bc4b", "#285db2", "#8f3a7d", "#b8512c", "#2e9c2e", "#e2443a", "#141416"];
const BORDERS = ["#ffffff", "#ece8df", "#0a0a0b", "#d7bc4b", "#acdaed", "#f6dcea"];

type Tile = {
  ch: string;
  font: Font;
  fg: string;
  shape: string; // valeur de clip-path
  rings: string[]; // du contour extérieur au papier (dernier)
  ringStep: number; // épaisseur d'un anneau, en em
  rot: number;
  scale: number;
};

type Rand = () => number;
/** Générateur déterministe : le rendu serveur et le premier rendu navigateur sont identiques. */
function seeded(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r: Rand, a: number, b: number) => a + r() * (b - a);
const choice = <T,>(r: Rand, list: readonly T[]) => list[Math.floor(r() * list.length)];

const luminance = (hex: string) => {
  const [R, G, B] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Forme découpée au hasard, en pourcentages de la boîte. */
function randomShape(r: Rand): string {
  const roll = r();
  if (roll < 0.1) return "ellipse(50% 50% at 50% 50%)";
  if (roll < 0.18) return "inset(0 round 32%)";
  if (roll < 0.28) {
    // pointe vers le haut, comme certains papiers du t-shirt Martinican
    const j = () => between(r, -3, 3);
    return `polygon(${50 + j()}% 0%, ${100 - Math.abs(j())}% ${20 + j()}%, ${100 - Math.abs(j())}% 100%, ${Math.abs(j())}% 100%, ${Math.abs(j())}% ${20 + j()}%)`;
  }
  // polygone irrégulier : coins et milieux d'arêtes décalés, un coin parfois coupé
  const m = 10;
  const pts: [number, number][] = [
    [between(r, 0, m), between(r, 0, m)],
    [between(r, 30, 70), between(r, 0, m / 2)],
    [between(r, 100 - m, 100), between(r, 0, m)],
    [between(r, 100 - m / 2, 100), between(r, 35, 65)],
    [between(r, 100 - m, 100), between(r, 100 - m, 100)],
    [between(r, 30, 70), between(r, 100 - m / 2, 100)],
    [between(r, 0, m), between(r, 100 - m, 100)],
    [between(r, 0, m / 2), between(r, 35, 65)],
  ];
  // on retire au hasard 0 à 3 points d'arête pour varier le nombre de côtés
  const drop = Math.floor(r() * 4);
  const edgeIdx = [1, 3, 5, 7].sort(() => r() - 0.5).slice(0, drop);
  const kept = pts.filter((_, i) => !edgeIdx.includes(i));
  if (r() < 0.35) {
    // coin coupé net
    const c = Math.floor(r() * kept.length);
    kept[c] = [kept[c][0] + (kept[c][0] < 50 ? 14 : -14), kept[c][1] + (kept[c][1] < 50 ? 4 : -4)];
  }
  return `polygon(${kept.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(", ")})`;
}

function randomTile(r: Rand, ch: string, rot: number): Tile {
  const paper = choice(r, PAPERS);
  const inks = INKS.filter((c) => contrast(c, paper) >= 3.2);
  const fg = choice(r, inks.length ? inks : ["#0a0a0b"]);
  const kind = r();
  let rings: string[];
  let ringStep = 0.06;
  if (kind < 0.25) {
    rings = [paper]; // papier nu
  } else if (kind < 0.7) {
    rings = [choice(r, BORDERS.filter((b) => b !== paper)), paper]; // contour fin type « autocollant découpé »
  } else {
    // double filet : contour, papier, fin liseré, papier
    const b = choice(r, BORDERS.filter((x) => x !== paper));
    rings = [b, paper, b, paper];
    ringStep = 0.05;
  }
  const font = choice(r, FONTS);
  // parfois une minuscule, comme sur les t-shirts (« reprEsent »)
  const letter = r() < 0.18 ? ch.toLowerCase() : ch.toUpperCase();
  return { ch: letter, font, fg, shape: randomShape(r), rings, ringStep, rot, scale: between(r, 0.94, 1.06) };
}

const ROTATIONS = [-3.5, 2.5, -1.5, 3.5, -2.5, 1.5, -1, 3];
const FRAME_MS = 90; // vitesse du défilement des styles
const START_MS = 700; // la première lettre se fixe après 0,7 s
const STEP_MS = 90; // puis une lettre toutes les 90 ms

export function Ransom({ text, className = "" }: { text: string; className?: string }) {
  const chars = [...text.replace(/ /g, "")];
  const rot = (i: number) => ROTATIONS[(i * 5 + 2) % ROTATIONS.length];

  // Premier rendu (serveur) : styles fixés par une graine.
  const [tiles, setTiles] = useState<Tile[]>(() => {
    const r = seeded(2024);
    return chars.map((ch, i) => randomTile(r, ch, rot(i)));
  });
  const [settled, setSettled] = useState(0);

  useEffect(() => {
    // Ensuite : vrai hasard, différent à chaque visite.
    const finals = chars.map((ch, i) => randomTile(Math.random, ch, rot(i)));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setTimeout(() => {
        setTiles(finals);
        setSettled(chars.length);
      }, 0);
      return () => clearTimeout(id);
    }
    const t0 = performance.now();
    const id = setInterval(() => {
      const count = Math.min(chars.length, Math.max(0, Math.floor((performance.now() - t0 - START_MS) / STEP_MS) + 1));
      setSettled(count);
      setTiles(chars.map((ch, i) => (i < count ? finals[i] : randomTile(Math.random, ch, rot(i)))));
      if (count >= chars.length) clearInterval(id);
    }, FRAME_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  let i = 0;
  return (
    <span role="img" aria-label={text} className={`inline-flex flex-col items-start gap-1.5 ${className}`}>
      {text.split(" ").map((word, w) => (
        <span key={w} aria-hidden="true" className="inline-flex flex-nowrap gap-[3px] whitespace-nowrap">
          {[...word].map(() => {
            const index = i++;
            const t = tiles[index];
            const inner = t.rings.length * t.ringStep;
            return (
              <span
                key={index}
                className="ransom-tile relative inline-block"
                style={{
                  ["--r" as string]: `${t.rot}deg`,
                  ["--s" as string]: t.scale,
                  ["--i" as string]: index,
                  width: "1.08em",
                  height: "1.28em",
                  filter: "drop-shadow(0 0.07em 0 rgb(0 0 0 / 0.55))",
                }}
              >
                {t.rings.map((color, k) => (
                  <span key={k} className="absolute" style={{ inset: `${k * t.ringStep}em`, background: color, clipPath: t.shape }} />
                ))}
                <span
                  className={`absolute grid place-items-center leading-none ${index < settled ? "ransom-pop" : ""}`}
                  style={{
                    inset: `${inner - t.ringStep}em`,
                    color: t.fg,
                    fontFamily: t.font.family,
                    fontWeight: t.font.weight,
                    fontStyle: t.font.italic ? "italic" : "normal",
                    fontSize: `${t.font.size * (t.rings.length > 2 ? 0.86 : 1)}em`,
                  }}
                >
                  {t.ch}
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
