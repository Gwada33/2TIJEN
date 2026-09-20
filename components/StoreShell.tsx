import Image from "next/image";
import Link from "next/link";
import { drop } from "@/config/drop";
import { CartProvider } from "@/components/CartProvider";
import { CartButton, CartDrawer } from "@/components/CartDrawer";
import { SiteFooter } from "@/components/SiteFooter";
import { formatEuros } from "@/lib/format";
import type { Storefront } from "@/lib/storefront";

/** Enveloppe commune (accueil et pages produit) : panier, en-tête, bandeaux, pied de page. */
export function StoreShell({ store, home = false, children }: { store: Storefront; home?: boolean; children: React.ReactNode }) {
  const { mode, phase, earlyAccess, dbOk } = store;
  // Sur l'accueil on défile jusqu'à la section ; ailleurs on revient à l'accueil.
  const to = (hash: string) => (home ? hash : `/${hash}`);
  const cta = mode === "open" ? { href: to("#pieces"), label: "Précommander" } : { href: to("#liste"), label: phase === "closed" ? "Drop 2" : "Liste d'attente" };

  return (
    <CartProvider
      canBuy={mode === "open"}
      designs={store.designs}
      maxPieces={drop.maxPiecesPerOrder}
      accessToken={earlyAccess ? store.token : null}
      deliveryOptions={{
        pickupLabel: drop.shipping.pickupLabel,
        pickupPrice: drop.shipping.pickupPrice === 0 ? "Gratuit" : formatEuros(drop.shipping.pickupPrice),
        shippingLabel: drop.shipping.metropoleLabel,
        shippingPrice: formatEuros(drop.shipping.metropolePrice),
      }}
    >
      <header className="sticky top-0 z-30 border-b border-line bg-night/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex min-h-11 min-w-11 items-center" aria-label={`${drop.brand}, accueil`}>
            <Image src="/logo-2t-white.png" alt="" width={36} height={36} className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <CartButton />
            <Link href={cta.href} className="btn btn-ghost !min-h-11 !px-4 !text-[0.72rem] sm:!px-5">{cta.label}</Link>
          </div>
        </div>
      </header>

      <main id="contenu">
        {earlyAccess && (
          <p role="status" className="bg-pink-bright px-5 py-3 text-center text-sm font-bold text-night">Accès anticipé activé.</p>
        )}
        {!dbOk && process.env.NODE_ENV !== "production" && (
          <p role="alert" className="bg-sun px-5 py-3 text-center text-sm font-bold text-night">
            Mode démo : base de données non connectée, achat désactivé (voir le README).
          </p>
        )}
        {children}
      </main>

      <SiteFooter />
      <CartDrawer />
    </CartProvider>
  );
}
