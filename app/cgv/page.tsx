import type { Metadata } from "next";
import { drop } from "@/config/drop";
import { LegalLayout, TODO } from "@/components/LegalLayout";
import { formatEuros } from "@/lib/format";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default function Page() {
  return (
    <LegalLayout title="Conditions générales de vente">
      <h2>1. Vendeur</h2>
      <p>{drop.brand}, <TODO>identité complète, SIRET, adresse, voir mentions légales</TODO>.</p>
      <h2>2. Nature de la vente : précommande</h2>
      <p>
        Les produits sont vendus en <strong>précommande</strong>, en quantité limitée ({drop.designs.length} designs, pièces numérotées).
        La fabrication est lancée à la clôture de la préco si un nombre minimum de commandes est atteint
        (<TODO>à confirmer : {drop.production.minOrders} commandes, {drop.production.minOrdersPerDesign} par design</TODO>).
        <TODO>conséquence si le minimum n&apos;est pas atteint (annulation et remboursement ?)</TODO>
      </p>
      <h2>3. Prix</h2>
      <p>
        Prix en euros, TTC <TODO>vérifier le régime de TVA, ex. franchise en base</TODO> : {formatEuros(drop.prices.regular)} par t-shirt,
        {" "}{formatEuros(drop.prices.earlyBird)} pendant l&apos;offre early bird (dans la limite de {drop.earlyBird.maxPieces} pièces et de {drop.earlyBird.durationHours} h après l&apos;ouverture),
        pack 2 designs à {formatEuros(drop.prices.pack)}. Les frais de livraison sont indiqués avant le paiement.
      </p>
      <h2>4. Commande et paiement</h2>
      <p>Le paiement est exigible en totalité à la commande, par carte bancaire (ou Apple Pay / Google Pay) via Stripe. Les pièces sont réservées {drop.reservationMinutes} minutes pendant le paiement. La commande est confirmée par e-mail avec le numéro de chaque pièce.</p>
      <h2>5. Livraison</h2>
      <p>Remise en main propre en Guadeloupe (gratuite) ou envoi en métropole (frais : {formatEuros(drop.shipping.metropolePrice)}). Délai annoncé : {drop.deliveryDelay}. Ce délai est indicatif. <TODO>modalités de remise en main propre</TODO></p>
      <h2>6. Droit de rétractation</h2>
      <p>Voir la page <a href="/retours">Retours et échanges</a>. <TODO>formulaire type de rétractation</TODO></p>
      <h2>7. Garanties légales</h2>
      <p>Les produits bénéficient de la garantie légale de conformité et de la garantie des vices cachés, dans les conditions prévues par le Code de la consommation.</p>
      <h2>8. Données personnelles</h2>
      <p>Voir la <a href="/confidentialite">politique de confidentialité</a>.</p>
      <h2>9. Médiation et litiges</h2>
      <p>Médiateur de la consommation : <TODO>nom et coordonnées du médiateur</TODO>. Droit applicable : droit français. <TODO>juridiction compétente</TODO></p>
    </LegalLayout>
  );
}
