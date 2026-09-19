import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return ["", "/cgv", "/mentions-legales", "/confidentialite", "/retours"].map((path) => ({ url: `${base}${path}` }));
}
