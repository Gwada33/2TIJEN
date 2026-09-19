import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Le projet est autonome : on fixe la racine pour éviter les avertissements de lockfile voisin.
  turbopack: { root: path.resolve(import.meta.dirname) },
  images: { formats: ["image/avif", "image/webp"] },
  poweredByHeader: false,
};

export default nextConfig;
