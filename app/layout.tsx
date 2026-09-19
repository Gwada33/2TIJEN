import type { Metadata, Viewport } from "next";
import { Alfa_Slab_One, Archivo_Black, Inter } from "next/font/google";
import { drop } from "@/config/drop";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"], display: "swap" });
// Les deux polices « affiche » ne servent qu'au titre en lettres découpées.
const slab = Alfa_Slab_One({ variable: "--f-slab", weight: "400", subsets: ["latin"], display: "swap" });
const heavy = Archivo_Black({ variable: "--f-heavy", weight: "400", subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description =
  "Précommande du premier drop 2TIJEN : t-shirts oversize numérotés, 50 pièces par design. Guadeloupean Represent.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${drop.brand} — ${drop.slogan}`, template: `%s · ${drop.brand}` },
  description,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: drop.brand,
    title: `${drop.brand} — ${drop.slogan}`,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "T-shirts 2TIJEN Guadeloupean Represent et Martinican Represent" }],
  },
  twitter: { card: "summary_large_image", title: `${drop.brand} — ${drop.slogan}`, description, images: ["/og.png"] },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${body.variable} ${slab.variable} ${heavy.variable}`}>
      <body className="min-h-screen">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
