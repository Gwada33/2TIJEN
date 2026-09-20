import type { GalleryPhoto } from "@/config/drop";

type InstagramMedia = { media_type?: string; media_url?: string; thumbnail_url?: string; permalink?: string; caption?: string };

/** Transforme la réponse de l'API Instagram en tuiles (fonction pure, testée). */
export function parseInstagramMedia(json: unknown, limit = 8): GalleryPhoto[] {
  const data = (json as { data?: InstagramMedia[] } | null)?.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((m) => ({ src: m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url, m }))
    .filter((x): x is { src: string; m: InstagramMedia } => typeof x.src === "string" && x.src.startsWith("https://"))
    .slice(0, limit)
    .map(({ src, m }) => ({
      src,
      alt: (m.caption ?? "Photo publiée sur Instagram").replace(/\s+/g, " ").slice(0, 120),
      href: typeof m.permalink === "string" && m.permalink.startsWith("https://") ? m.permalink : undefined,
    }));
}

/** « https://www.instagram.com/2tijen/ » → « @2tijen » */
export function handleOf(url: string): string {
  const name = new URL(url).pathname.split("/").filter(Boolean)[0] ?? "";
  return name ? `@${name.replace(/^@/, "")}` : url;
}
