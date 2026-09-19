/**
 * Titre en lettres « découpées » façon ransom note, repris des dos des t-shirts.
 * À utiliser avec parcimonie (hero uniquement). Le texte lisible est porté par
 * aria-label ; les lettres décoratives sont masquées aux lecteurs d'écran.
 * Chaque lettre « se colle » à l'arrivée puis flotte légèrement (voir globals.css).
 */
const TILES = [
  { bg: "#d7bc4b", fg: "#0a0a0b", font: "font-slab" },
  { bg: "#b5549f", fg: "#ffffff", font: "font-heavy" },
  { bg: "#ece8df", fg: "#0a0a0b", font: "font-slab" },
  { bg: "#285db2", fg: "#ffffff", font: "font-heavy" },
  { bg: "#2e9c2e", fg: "#0a0a0b", font: "font-slab" },
  { bg: "#b8512c", fg: "#ffffff", font: "font-heavy" },
  { bg: "#40959b", fg: "#ffffff", font: "font-slab" },
  { bg: "#f6dcea", fg: "#8f3a7d", font: "font-heavy" },
] as const;
const ROTATIONS = [-3, 2, -1.5, 3, -2.5, 1.5, -1, 2.5];

export function Ransom({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(" ");
  let i = 0;
  return (
    <span role="img" aria-label={text} className={`inline-flex flex-col items-start gap-1.5 ${className}`}>
      {words.map((word, w) => (
        <span key={w} aria-hidden="true" className="inline-flex flex-nowrap gap-[3px] whitespace-nowrap">
          {[...word].map((ch) => {
            const tile = TILES[(i * 3 + 1) % TILES.length];
            const rot = ROTATIONS[(i * 5 + 2) % ROTATIONS.length];
            const index = i;
            i += 1;
            return (
              <span
                key={index}
                className={`${tile.font} ransom-tile inline-block rounded-[3px] px-[0.18em] py-[0.02em] leading-[1.1] shadow-[0_3px_0_rgb(0_0_0/0.55)]`}
                style={{ background: tile.bg, color: tile.fg, ["--r" as string]: `${rot}deg`, ["--i" as string]: index }}
              >
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
