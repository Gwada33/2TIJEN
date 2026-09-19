import Link from "next/link";
import { drop } from "@/config/drop";
import { estimatedDelivery, formatDay } from "@/lib/format";

/** Pied de page : infos pratiques, réseaux, pages légales. */
export function SiteFooter() {
  const link = "underline-offset-4 hover:text-sun hover:underline";
  const { from, to } = estimatedDelivery();
  return (
    <footer className="bg-night text-ink">
      <div className="madras" aria-hidden="true" />
      <div className="px-5 pb-10 pt-14">
        <div className="mx-auto max-w-6xl">
          <p aria-hidden="true" className="madras-text select-none font-heavy text-[clamp(4rem,22vw,13rem)] leading-[0.9] tracking-tight">
            2TIJEN
          </p>
          <p className="mt-3 text-muted">{drop.slogan}</p>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info title="Précommande">Ton t-shirt est fabriqué après la clôture de la préco.</Info>
            <Info title="Livraison">
              Entre le {formatDay(from)} et le {formatDay(to, true)}. Retrait en Guadeloupe ou envoi en métropole.
            </Info>
            <Info title="Paiement">Carte, Apple Pay ou Google Pay, via Stripe.</Info>
            <Info title="Une question ?">
              <a className="font-bold text-ink underline" href={`https://wa.me/${drop.contact.whatsapp}`} rel="noopener noreferrer" target="_blank">WhatsApp</a>
              {" · "}
              <a className="font-bold text-ink underline" href={`mailto:${drop.contact.email}`}>E-mail</a>
            </Info>
          </ul>

          <div className="mt-12 grid gap-10 border-t border-line pt-10 sm:grid-cols-2">
            <nav aria-label="Réseaux sociaux">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">Suis-nous</p>
              <ul className="space-y-2">
                <li><a className={link} href={drop.contact.instagram} rel="noopener noreferrer" target="_blank">Instagram</a></li>
                <li><a className={link} href={drop.contact.tiktok} rel="noopener noreferrer" target="_blank">TikTok</a></li>
              </ul>
            </nav>
            <nav aria-label="Informations légales">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">Infos</p>
              <ul className="space-y-2">
                <li><Link className={link} href="/cgv">Conditions générales de vente</Link></li>
                <li><Link className={link} href="/retours">Retours et échanges</Link></li>
                <li><Link className={link} href="/mentions-legales">Mentions légales</Link></li>
                <li><Link className={link} href="/confidentialite">Confidentialité</Link></li>
              </ul>
            </nav>
          </div>
          <p className="mt-10 text-sm text-muted">© {new Date().getFullYear()} {drop.brand}</p>
        </div>
      </div>
    </footer>
  );
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-3xl border border-line bg-surface p-6">
      <h3 className="font-heavy text-sm font-normal uppercase tracking-wide">{title}</h3>
      <p className="mt-2 leading-relaxed text-muted">{children}</p>
    </li>
  );
}
