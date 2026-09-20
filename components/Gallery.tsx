import Image from "next/image";
import { drop } from "@/config/drop";
import { loadGallery } from "@/lib/gallery";
import { handleOf } from "@/lib/instagram";

const RATIOS = ["4/5", "1/1", "3/4", "1/1", "4/5", "3/4", "1/1", "4/5"];

/** Galerie « porté » : photos de shooting, chaque tuile mène à la publication (Instagram / TikTok). */
export async function Gallery() {
  const photos = await loadGallery();
  const placeholders = photos.length === 0;
  const items = placeholders ? Array.from({ length: 6 }, (_, i) => i) : photos;
  const handle = handleOf(drop.contact.instagram);
  const external = { rel: "noopener noreferrer", target: "_blank" } as const;

  return (
    <section id="shooting" aria-labelledby="titre-shooting" className="mx-auto max-w-6xl px-5 pb-16 sm:pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="titre-shooting" className="font-heavy text-2xl uppercase tracking-wide sm:text-3xl">Porté</h2>
          <p className="mt-2 text-sm text-muted">{handle} sur Instagram et TikTok</p>
        </div>
        <div className="flex gap-3">
          <a href={drop.contact.instagram} className="btn btn-ghost !min-h-10 !px-5 !text-[0.65rem]" {...external}>Instagram</a>
          <a href={drop.contact.tiktok} className="btn btn-ghost !min-h-10 !px-5 !text-[0.65rem]" {...external}>TikTok</a>
        </div>
      </div>

      <ul className="mt-8 columns-2 gap-3 md:columns-3 md:gap-4">
        {items.map((item, i) => {
          const ratio = (typeof item === "number" ? undefined : item.ratio) ?? RATIOS[i % RATIOS.length];
          const style = { aspectRatio: ratio } as React.CSSProperties;
          if (typeof item === "number") {
            // Tuile provisoire (aucune photo fournie) : madras du design + logo
            return (
              <li key={i} className="mb-3 break-inside-avoid md:mb-4">
                <div
                  className="madras-panel relative grid place-items-center overflow-hidden"
                  style={{ ...style, "--madras-img": `url(${[0, 1, 1, 0, 0, 1][i % 6] ? drop.designs[1].madras : drop.designs[0].madras})` } as React.CSSProperties}
                >
                  <Image src="/logo-2t-white.png" alt="" width={56} height={56} className="h-14 w-auto opacity-30" />
                  <span className="absolute bottom-3 left-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/80">Photo shooting à venir</span>
                </div>
              </li>
            );
          }
          const remote = item.src.startsWith("http");
          return (
            <li key={item.src} className="mb-3 break-inside-avoid md:mb-4">
              <a href={item.href ?? drop.contact.instagram} className="group relative block overflow-hidden bg-surface" style={style} aria-label={`${item.alt} (ouvrir la publication)`} {...external}>
                {remote ? (
                  // Image d'Instagram : adresse externe qui change, on ne l'optimise pas.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.src} alt={item.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <Image src={item.src} alt={item.alt} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-3 text-xs font-bold uppercase tracking-[0.15em] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
                  <span>{handle}</span>
                  <span>↗</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
