import Link from "next/link";
import { drop } from "@/config/drop";
import { SiteFooter } from "@/components/SiteFooter";

/** Habillage des pages légales, avec la bannière « à faire valider ». */
export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5">
          <Link href="/" className="font-black text-xl tracking-wide">← {drop.brand}</Link>
        </div>
      </header>
      <main id="contenu" className="mx-auto max-w-3xl px-5 py-12">
        <p role="note" className="mb-8 rounded-2xl border-2 border-orange bg-yellow/30 p-4 font-bold">
          Modèle à compléter et à faire valider par un professionnel (juriste, avocat ou expert-comptable) avant la mise en ligne.
          Les champs [À COMPLÉTER] doivent être remplis.
        </p>
        <h1 className="font-black text-4xl uppercase leading-none">{title}</h1>
        <div className="legal mt-8 space-y-4 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-black [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export const TODO = ({ children }: { children: React.ReactNode }) => (
  <mark className="bg-yellow/60 px-1">[À COMPLÉTER : {children}]</mark>
);
