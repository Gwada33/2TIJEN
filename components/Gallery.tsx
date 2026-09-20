import { drop } from "@/config/drop";
import { PhotoTile } from "@/components/PhotoTile";
import { loadGallery } from "@/lib/gallery";

const RATIOS = ["4/5", "1/1", "3/4", "1/1", "4/5", "3/4", "1/1", "4/5"];
const external = { rel: "noopener noreferrer", target: "_blank" } as const;

/** Galerie « porté » : photos de shooting, chaque tuile mène à la publication (Instagram / TikTok). */
export async function Gallery() {
  const photos = await loadGallery();
  const items = photos.length ? photos : Array.from({ length: 6 }, () => undefined);

  return (
    <section id="shooting" aria-labelledby="titre-shooting" className="mx-auto max-w-6xl px-5 pb-16 sm:pb-24">
      <div className="flex items-center justify-between gap-4">
        <h2 id="titre-shooting" className="font-heavy text-2xl uppercase tracking-wide sm:text-3xl">Porté</h2>
        <div className="flex gap-3">
          <a href={drop.contact.instagram} className="btn btn-ghost !min-h-10 !px-5 !text-[0.65rem]" {...external}>Instagram</a>
          <a href={drop.contact.tiktok} className="btn btn-ghost !min-h-10 !px-5 !text-[0.65rem]" {...external}>TikTok</a>
        </div>
      </div>

      <ul className="mt-8 columns-2 gap-3 md:columns-3 md:gap-4">
        {items.map((photo, i) => (
          <li key={photo?.src ?? i} className="mb-3 break-inside-avoid md:mb-4">
            <PhotoTile photo={photo} madras={[0, 1, 1, 0, 0, 1][i % 6] ? drop.designs[1].madras : drop.designs[0].madras} ratio={RATIOS[i % RATIOS.length]} fallbackHref={drop.contact.instagram} />
          </li>
        ))}
      </ul>
    </section>
  );
}
