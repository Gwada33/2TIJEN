import Link from "next/link";
import { drop } from "@/config/drop";
import { SiteFooter } from "@/components/SiteFooter";

/** Habillage des pages légales, avec la bannière « à faire valider ». */
export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="bg-night">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5">
          <Link href="/" className="inline-flex min-h-11 items-center font-heavy text-xl tracking-wide hover:text-sun">← {drop.brand}</Link>
        </div>
        <div className="madras" aria-hidden="true" />
      </header>
      <main id="contenu" className="mx-auto max-w-3xl px-5 py-12">
        <p role="note" className="mb-8 rounded-2xl border-2 border-orange bg-sun/15 p-4 font-bold">
          Modèle à compléter et à faire valider par un professionnel (juriste, avocat ou expert-comptable) avant la mise en ligne.
          Les champs [À COMPLÉTER] doivent être remplis.
        </p>
        <h1 className="font-heavy text-2xl uppercase tracking-wide">{title}</h1>
        <div className="legal mt-8 space-y-4 leading-relaxed [&_h2]:mt-8 [&_h2]:font-heavy [&_h2]:text-base [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export const TODO = ({ children }: { children: React.ReactNode }) => (
  <mark className="bg-sun px-1 text-night">[À COMPLÉTER : {children}]</mark>
);
