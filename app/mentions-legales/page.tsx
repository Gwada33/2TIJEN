import type { Metadata } from "next";
import { drop } from "@/config/drop";
import { LegalLayout, TODO } from "@/components/LegalLayout";

export const metadata: Metadata = { title: "Mentions légales" };

export default function Page() {
  return (
    <LegalLayout title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        {drop.brand}, <TODO>forme juridique : micro-entreprise, SAS…</TODO><br />
        Exploitant : <TODO>nom et prénom</TODO><br />
        SIRET : <TODO>numéro SIRET</TODO><br />
        Adresse : <TODO>adresse du siège, Guadeloupe</TODO><br />
        E-mail : {drop.contact.email}<br />
        Directeur de la publication : <TODO>nom</TODO>
      </p>
      <h2>Hébergement</h2>
      <p>Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Base de données : Supabase <TODO>région d&apos;hébergement</TODO>.</p>
      <h2>Propriété intellectuelle</h2>
      <p>Les visuels, logos, marques et textes du site sont la propriété de {drop.brand}. Toute reproduction sans autorisation est interdite.</p>
      <h2>Données personnelles</h2>
      <p>Voir la <a href="/confidentialite">politique de confidentialité</a>.</p>
    </LegalLayout>
  );
}
