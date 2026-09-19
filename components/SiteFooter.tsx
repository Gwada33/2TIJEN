import Link from "next/link";
import { drop } from "@/config/drop";
import { estimatedDelivery, formatDay } from "@/lib/format";

/** Pied de page : infos pratiques, contact, pages légales. */
export function SiteFooter() {
  const { from, to } = estimatedDelivery();
  const link = "underline-offset-4 hover:text-sun hover:underline";
  const title = "mb-4 text-xs font-bold uppercase tracking-[0.2em] text-muted";
  return (
    <footer className="bg-night text-ink">
      <div className="madras" aria-hidden="true" />
      <div className="px-5 pb-10 pt-14">
        <div className="mx-auto max-w-6xl">
          <p aria-hidden="true" className="madras-text select-none font-heavy text-[clamp(3.5rem,20vw,11rem)] leading-[0.9] tracking-tight">
            2TIJEN
          </p>

          <div className="mt-12 grid gap-10 border-t border-line pt-10 sm:grid-cols-3">
            <div>
              <p className={title}>Infos</p>
              <ul className="space-y-2 text-sm text-muted">
                <li>Précommande : fabrication après la clôture.</li>
                <li>Livraison estimée entre le {formatDay(from)} et le {formatDay(to, true)}.</li>
                <li>Paiement sécurisé par Stripe.</li>
              </ul>
            </div>
            <div>
              <p className={title}>Contact</p>
              <ul className="space-y-2 text-sm">
                <li><a className={link} href={`https://wa.me/${drop.contact.whatsapp}`} rel="noopener noreferrer" target="_blank">WhatsApp</a></li>
                <li><a className={link} href={drop.contact.instagram} rel="noopener noreferrer" target="_blank">Instagram</a></li>
                <li><a className={link} href={drop.contact.tiktok} rel="noopener noreferrer" target="_blank">TikTok</a></li>
                <li><a className={link} href={`mailto:${drop.contact.email}`}>E-mail</a></li>
              </ul>
            </div>
            <nav aria-label="Informations légales">
              <p className={title}>Légal</p>
              <ul className="space-y-2 text-sm">
                <li><Link className={link} href="/cgv">CGV</Link></li>
                <li><Link className={link} href="/retours">Retours et échanges</Link></li>
                <li><Link className={link} href="/mentions-legales">Mentions légales</Link></li>
                <li><Link className={link} href="/confidentialite">Confidentialité</Link></li>
              </ul>
            </nav>
          </div>
          <p className="mt-10 text-xs text-muted">© {new Date().getFullYear()} {drop.brand}</p>
        </div>
      </div>
    </footer>
  );
}
