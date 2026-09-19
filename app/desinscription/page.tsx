import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { unsubscribe } from "./actions";

export const metadata: Metadata = { title: "Désinscription", robots: { index: false } };

/**
 * Le lien de l'e-mail ouvre cette page ; la désinscription n'a lieu qu'au clic
 * sur le bouton (les scanners d'e-mails qui « visitent » les liens ne désinscrivent donc personne).
 */
export default async function Page({ searchParams }: PageProps<"/desinscription">) {
  const { token, fait } = await searchParams;
  const valid = typeof token === "string" && /^[a-f0-9]{64}$/.test(token);

  return (
    <>
      <main id="contenu" className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="font-heavy text-4xl font-normal uppercase leading-none">Désinscription</h1>
        {fait ? (
          <p role="status" className="mt-6 text-lg">C&apos;est fait : tu ne recevras plus d&apos;e-mails de la liste d&apos;attente.</p>
        ) : valid ? (
          <form action={unsubscribe} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <p className="mb-6 text-lg">Confirmer la désinscription de la liste d&apos;attente 2TIJEN ?</p>
            <button type="submit" className="btn btn-primary">Me désinscrire</button>
          </form>
        ) : (
          <p className="mt-6 text-lg">Lien invalide. Écris-nous pour te désinscrire.</p>
        )}
        <Link href="/" className="mt-10 inline-block underline">Retour au site</Link>
      </main>
      <SiteFooter />
    </>
  );
}
