import Image from "next/image";
import type { GalleryPhoto } from "@/config/drop";

/**
 * Une photo de shooting. Avec `href` (ou `fallbackHref`) elle devient un lien vers la publication.
 * Sans photo (`photo` absente) : tuile provisoire aux couleurs du madras, avec le logo.
 */
export function PhotoTile({ photo, madras, ratio = "4/5", fallbackHref }: { photo?: GalleryPhoto; madras: string; ratio?: string; fallbackHref?: string }) {
  const style = { aspectRatio: photo?.ratio ?? ratio } as React.CSSProperties;
  if (!photo) {
    return (
      <div className="madras-panel relative grid place-items-center overflow-hidden" style={{ ...style, "--madras-img": `url(${madras})` } as React.CSSProperties} aria-hidden="true">
        <Image src="/logo-2t-white.png" alt="" width={56} height={56} className="h-14 w-auto opacity-30" />
      </div>
    );
  }
  const href = photo.href ?? fallbackHref;
  const remote = photo.src.startsWith("http");
  const img = remote ? (
    // Image d'Instagram : adresse externe qui change, on ne l'optimise pas.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.src} alt={photo.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
  ) : (
    <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 768px) 33vw, 80vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
  );
  if (!href) return <div className="relative overflow-hidden bg-surface" style={style}>{img}</div>;
  return (
    <a href={href} className="group relative block overflow-hidden bg-surface" style={style} aria-label={`${photo.alt} (ouvrir la publication)`} rel="noopener noreferrer" target="_blank">
      {img}
      <span className="absolute bottom-0 right-0 p-3 text-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">↗</span>
    </a>
  );
}
