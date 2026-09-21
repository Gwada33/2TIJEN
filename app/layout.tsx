import type { Metadata, Viewport } from "next";
import { Alfa_Slab_One, Inter, Unbounded, Yellowtail } from "next/font/google";
import { drop } from "@/config/drop";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"], display: "swap" });
// Polices « affiche » : Unbounded (titres, boutons, lettres découpées) et Alfa Slab One (lettres découpées).
const slab = Alfa_Slab_One({ variable: "--f-slab", weight: "400", subsets: ["latin"], display: "swap" });
// Écriture manuscrite du petit mot « Drop » (comme « By 2Tijen » sur le t-shirt).
// preload désactivé : ce mot ne sert que sur l'accueil, inutile de le charger partout.
const script = Yellowtail({ variable: "--f-script", weight: "400", subsets: ["latin"], display: "swap", preload: false });
const heavy = Unbounded({ variable: "--f-heavy", subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description =
  "Précommande du premier drop 2TIJEN : t-shirts oversize numérotés, 50 pièces par design. Caribbean Represent.";

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

export const viewport: Viewport = { themeColor: "#0a0a0b" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" className={`${body.variable} ${slab.variable} ${heavy.variable} ${script.variable}`}>
      <body className="min-h-screen">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-sun focus:px-4 focus:py-2 focus:text-night"
        >
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
