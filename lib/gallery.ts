import "server-only";
import { drop, type GalleryPhoto } from "@/config/drop";
import { parseInstagramMedia } from "@/lib/instagram";

/**
 * Photos de la galerie « porté ».
 * - Si INSTAGRAM_ACCESS_TOKEN est défini : les dernières publications Instagram (photos et
 *   miniatures de vidéos), rechargées toutes les heures.
 * - Sinon (ou en cas d'erreur) : les photos listées dans config/drop.ts.
 */

export async function loadGallery(): Promise<GalleryPhoto[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (token) {
    try {
      const url = new URL("https://graph.instagram.com/me/media");
      url.searchParams.set("fields", "media_type,media_url,thumbnail_url,permalink,caption");
      url.searchParams.set("limit", "12");
      url.searchParams.set("access_token", token);
      const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const photos = parseInstagramMedia(await res.json());
        if (photos.length) return photos;
      } else {
        console.error("Instagram", res.status); // souvent : jeton expiré (valable 60 jours)
      }
    } catch (e) {
      console.error("Instagram", e);
    }
  }
  return drop.gallery;
}
