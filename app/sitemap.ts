import type { MetadataRoute } from "next";
import { drop } from "@/config/drop";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return ["", ...drop.designs.map((d) => `/pieces/${d.id}`), "/cgv", "/mentions-legales", "/confidentialite", "/retours"].map((path) => ({ url: `${base}${path}` }));
}
