import type { Metadata } from "next";
import { drop } from "@/config/drop";
import { LegalLayout, TODO } from "@/components/LegalLayout";

export const metadata: Metadata = { title: "Retours et échanges" };

export default function Page() {
  return (
    <LegalLayout title="Retours et échanges">
      <h2>Droit de rétractation</h2>
      <p>
        Conformément au Code de la consommation, tu disposes de 14 jours à compter de la réception de ta commande pour te rétracter,
        sans avoir à te justifier. <TODO>vérifier les exceptions applicables et la formulation avec un professionnel</TODO>
      </p>
      <h2>Comment faire ?</h2>
      <p>Écris-nous à {drop.contact.email} (ou sur WhatsApp) avec ton numéro de commande et le numéro de ta pièce. Le t-shirt doit être neuf, non porté, non lavé, avec ses étiquettes.</p>
      <h2>Frais de retour</h2>
      <p><TODO>qui paie le retour : client ou {drop.brand}</TODO></p>
      <h2>Échanges de taille</h2>
      <p>Comme les pièces sont produites en quantité limitée, un échange dépend du stock disponible après la production. <TODO>politique d&apos;échange</TODO></p>
      <h2>Remboursement</h2>
      <p>Remboursement sous 14 jours après réception du retour, par le moyen de paiement utilisé. <TODO>cas où le minimum de commandes n&apos;est pas atteint à la clôture</TODO></p>
    </LegalLayout>
  );
}
