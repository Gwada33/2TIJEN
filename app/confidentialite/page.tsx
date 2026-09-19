import type { Metadata } from "next";
import { drop } from "@/config/drop";
import { LegalLayout, TODO } from "@/components/LegalLayout";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Page() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <h2>Responsable du traitement</h2>
      <p>{drop.brand}, <TODO>identité complète, voir mentions légales</TODO>. Contact : {drop.contact.email}.</p>
      <h2>Données collectées et finalités</h2>
      <ul>
        <li><strong>Commande</strong> : nom, e-mail, téléphone, adresse de livraison, contenu de la commande. Finalité : traiter et livrer la commande, obligations légales. Base légale : exécution du contrat.</li>
        <li><strong>Liste d&apos;attente</strong> : e-mail, numéro WhatsApp (facultatif), date du consentement. Finalité : t&apos;informer des drops et t&apos;envoyer l&apos;accès anticipé. Base légale : ton consentement.</li>
      </ul>
      <h2>Paiement</h2>
      <p>Le paiement est traité par Stripe. {drop.brand} ne voit et ne conserve jamais tes données de carte bancaire.</p>
      <h2>Destinataires et sous-traitants</h2>
      <p>Stripe (paiement), Supabase (base de données), Resend (envoi d&apos;e-mails), Vercel (hébergement). <TODO>vérifier les transferts hors UE et les garanties associées</TODO></p>
      <h2>Durée de conservation</h2>
      <p>Commandes : <TODO>durée, ex. 10 ans pour les pièces comptables</TODO>. Liste d&apos;attente : jusqu&apos;à ta désinscription, ou <TODO>durée maximale, ex. 3 ans sans interaction</TODO>.</p>
      <h2>Tes droits</h2>
      <p>Tu peux demander l&apos;accès, la rectification ou la suppression de tes données, et retirer ton consentement à tout moment, en écrivant à {drop.contact.email}. Chaque e-mail de la liste d&apos;attente contient un lien de désinscription. Tu peux aussi introduire une réclamation auprès de la CNIL (cnil.fr).</p>
      <h2>Cookies</h2>
      <p>Le site n&apos;utilise pas de cookie publicitaire ni de mesure d&apos;audience. <TODO>à mettre à jour si un outil d&apos;analyse est ajouté</TODO></p>
    </LegalLayout>
  );
}
