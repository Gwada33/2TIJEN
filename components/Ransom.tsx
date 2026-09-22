"use client";

import { useEffect, useState } from "react";

/**
 * Titre en lettres « découpées » façon ransom note, comme sur les t-shirts.
 *
 * Chaque lettre est un morceau de papier : forme découpée, police, couleur, bordure fine
 * (contour blanc ou double filet), casse et angle. À l'arrivée, tous ces réglages changent
 * AU HASARD en boucle, puis chaque lettre se fixe de gauche à droite sur son style FINAL,
 * toujours le même (tableau FINAL_STYLES, aux couleurs du t-shirt Guadeloupean Represent).
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

// Couleurs des papiers : SEULEMENT 4 teintes (+ crème et encre en neutres), comme une vraie
// sérigraphie à quelques couleurs de rack — pour que l'œil reconnaisse un jeu de couleurs choisi,
// pas une pioche au hasard. Rouge/or/sarcelle/rose : le trio drapeau + un accent carnaval.
const RED = "#d3402c";
const GOLD = "#f0af1f";
const TEAL = "#1a8a82";
const PINK = "#d43c8f";
const CREAM = "#f5ecd6";
const INK = "#171310";
const PAPERS = [RED, GOLD, TEAL, PINK, CREAM, INK];
const INKS = [INK, CREAM, GOLD, RED, TEAL, PINK];
const BORDERS = [CREAM, INK, GOLD, TEAL];

/**
 * Style final de chaque lettre (dans l'ordre du texte, espaces ignorés) : mêmes couleurs
 * que les lettres du t-shirt Guadeloupean Represent. Les indices de police renvoient à FONTS.
 */
type FinalStyle = { paper: string; ink: string; ring?: string; double?: boolean; font: number; lower?: boolean; shape?: string };
// Rythme : les 4 couleurs + crème + encre reviennent dans le même ordre 3 fois de suite sur les
// 18 lettres — l'œil reconnaît un jeu de couleurs répété, pas un tirage au hasard lettre par lettre.
const FINAL_STYLES: FinalStyle[] = [
  // CARIBBEAN
  { paper: RED, ink: CREAM, ring: CREAM, font: 0 },
  { paper: GOLD, ink: INK, ring: INK, font: 6 },
  { paper: TEAL, ink: CREAM, font: 0 },
  { paper: PINK, ink: CREAM, ring: CREAM, font: 2 },
  { paper: CREAM, ink: INK, ring: RED, double: true, font: 1 },
  { paper: INK, ink: CREAM, ring: GOLD, font: 0 },
  { paper: RED, ink: CREAM, font: 6 },
  { paper: GOLD, ink: INK, ring: CREAM, font: 2 },
  { paper: TEAL, ink: CREAM, ring: CREAM, font: 0 },
  // REPRESENT
  { paper: PINK, ink: CREAM, ring: CREAM, double: true, font: 6 },
  { paper: CREAM, ink: INK, ring: INK, font: 0 },
  { paper: INK, ink: CREAM, font: 2 },
  { paper: RED, ink: CREAM, ring: CREAM, font: 6, lower: true },
  { paper: GOLD, ink: INK, font: 0, lower: true, shape: "ellipse(50% 50% at 50% 50%)" },
  { paper: TEAL, ink: CREAM, ring: CREAM, font: 6 },
  { paper: PINK, ink: CREAM, font: 0 },
  { paper: CREAM, ink: INK, ring: GOLD, font: 1 },
  { paper: INK, ink: CREAM, ring: CREAM, font: 6 },
];

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

/** Redécoupe chaque arête d'un polygone avec 1 ou 2 points intermédiaires décalés perpendiculairement :
 * l'arête droite devient un bord déchiré, comme un morceau de papier arraché à la main. */
function tornEdges(r: Rand, pts: [number, number][], jag: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    out.push([x1, y1]);
    const segs = 1 + Math.floor(r() * 2);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    for (let s = 1; s <= segs; s++) {
      const t = s / (segs + 1);
      const j = between(r, -jag, jag);
      out.push([x1 + (x2 - x1) * t + nx * j, y1 + (y2 - y1) * t + ny * j]);
    }
  }
  return out;
}

const poly = (pts: [number, number][]) => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(", ")})`;

/**
 * Forme découpée au hasard, en pourcentages de la boîte. La plupart du temps : un rectangle
 * (comme une étiquette découpée aux ciseaux dans une page) dont chaque bord est arraché à la
 * main, garde son contour reconnaissable plutôt qu'un blob organique.
 */
function randomShape(r: Rand): string {
  const roll = r();
  if (roll < 0.08) return "ellipse(50% 50% at 50% 50%)";
  if (roll < 0.16) return "inset(0 round 30%)";
  if (roll < 0.26) {
    // pointe vers le haut, comme certains papiers du t-shirt Martinican
    const j = () => between(r, -3, 3);
    const pts: [number, number][] = [
      [50 + j(), 0],
      [100 - Math.abs(j()), 20 + j()],
      [100 - Math.abs(j()), 100],
      [Math.abs(j()), 100],
      [Math.abs(j()), 20 + j()],
    ];
    return poly(tornEdges(r, pts, 2.5));
  }
  // Rectangle de base (léger jeu sur les coins pour ne pas être parfaitement carré)...
  const m = 3;
  const pts: [number, number][] = [
    [between(r, 0, m), between(r, 0, m)],
    [between(r, 100 - m, 100), between(r, 0, m)],
    [between(r, 100 - m, 100), between(r, 100 - m, 100)],
    [between(r, 0, m), between(r, 100 - m, 100)],
  ];
  // ... un coin parfois franchement arraché en biais...
  if (r() < 0.4) {
    const c = Math.floor(r() * pts.length);
    const dx = pts[c][0] < 50 ? between(r, 10, 20) : -between(r, 10, 20);
    const dy = pts[c][1] < 50 ? between(r, 6, 14) : -between(r, 6, 14);
    pts[c] = [pts[c][0] + dx, pts[c][1] + dy];
  }
  // ... puis chaque bord redécoupé à la main : le contour reste un rectangle, les côtés non.
  return poly(tornEdges(r, pts, 4.2));
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

/** Tuile finale : le style du tableau ; forme découpée fixe (graine par lettre). Au-delà du tableau, on boucle. */
function finalTile(ch: string, index: number, rot: number): Tile {
  const f = FINAL_STYLES[index % FINAL_STYLES.length];
  const rings = f.ring ? (f.double ? [f.ring, f.paper, f.ring, f.paper] : [f.ring, f.paper]) : [f.paper];
  return {
    ch: f.lower ? ch.toLowerCase() : ch.toUpperCase(),
    font: FONTS[f.font],
    fg: f.ink,
    shape: f.shape ?? randomShape(seeded(100 + index * 31)),
    rings,
    ringStep: f.double ? 0.05 : 0.06,
    rot,
    scale: 1,
  };
}

const ROTATIONS = [-3.5, 2.5, -1.5, 3.5, -2.5, 1.5, -1, 3];
// Léger décalage vertical par lettre (n'affecte que le rendu, pas la boîte) : donne l'irrégularité
// d'un vrai collage de lettres découpées dans des magazines différents, plutôt qu'un alignement au cordeau.
const LIFTS = [-0.05, 0.04, -0.02, 0.05, 0.01, -0.045, 0.03, -0.015, 0.045, -0.03];
const lift = (i: number) => LIFTS[(i * 7 + 3) % LIFTS.length];
const FRAME_MS = 90; // vitesse du défilement des styles
const START_MS = 700; // la première lettre se fixe après 0,7 s
const STEP_MS = 90; // puis une lettre toutes les 90 ms

export function Ransom({ text, tag, className = "" }: { text: string; tag?: string; className?: string }) {
  const chars = [...text.replace(/ /g, "")];
  const rot = (i: number) => ROTATIONS[(i * 5 + 2) % ROTATIONS.length];

  // Premier rendu (serveur) : directement le style final, sans hasard.
  const finals = chars.map((ch, i) => finalTile(ch, i, rot(i)));
  const [tiles, setTiles] = useState<Tile[]>(finals);
  const [settled, setSettled] = useState(0);

  useEffect(() => {
    // Pendant l'animation : styles tirés au hasard, puis chaque lettre se fixe sur son style final.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setTimeout(() => {
        setTiles(finals);
        setSettled(chars.length);
      }, 0);
      return () => clearTimeout(id);
    }
    // L'animation démarre dès l'arrivée sur la page : les mises à jour ne touchent que de petites
    // tuiles de texte (pas l'image principale), donc pas besoin d'attendre la fin du chargement.
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
    <span role="img" aria-label={text} className={`relative inline-flex flex-col items-start gap-1.5 ${tag ? "pb-[0.45em]" : ""} ${className}`}>
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
                  ["--y" as string]: `${lift(index)}em`,
                  ["--i" as string]: index,
                  width: "1.08em",
                  height: "1.28em",
                  filter: "drop-shadow(0 0.07em 0 rgb(0 0 0 / 0.55))",
                }}
              >
                {t.rings.map((color, k) => (
                  <span key={k} className="ransom-paper absolute" style={{ inset: `${k * t.ringStep}em`, backgroundColor: color, clipPath: t.shape }} />
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
      {tag && (
        <span
          aria-hidden="true"
          className="ransom-tag absolute bottom-0 right-[0.4em] -rotate-6 font-script text-[1.15em] leading-none text-white"
          style={{ animationDelay: `${(START_MS + chars.length * STEP_MS) / 1000}s` }}
        >
          {tag}
        </span>
      )}
    </span>
  );
}
