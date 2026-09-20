"use client";

/** Erreur inattendue : page sombre de la marque, avec un bouton pour réessayer. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="contenu" className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <h1 className="font-heavy text-2xl uppercase tracking-wide">Un souci de notre côté.</h1>
        <p className="mt-3 text-muted">Réessaie dans un instant.</p>
        <button type="button" onClick={reset} className="btn btn-primary mt-8">Réessayer</button>
      </div>
    </main>
  );
}
