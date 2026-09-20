import Link from "next/link";
import { drop } from "@/config/drop";
import { estimatedDelivery, formatDay } from "@/lib/format";

/** Pied de page : marque, réseaux, infos pratiques, pages légales. */
export function SiteFooter() {
  const { from, to } = estimatedDelivery();
  const link = "underline-offset-4 hover:text-sun hover:underline";
  const title = "mb-4 text-xs font-bold uppercase tracking-[0.2em] text-muted";
  const social = "btn btn-ghost !min-h-11 !px-5 !text-[0.65rem]";
  const external = { rel: "noopener noreferrer", target: "_blank" } as const;
  return (
    <footer className="bg-night text-ink">
      <div className="madras" aria-hidden="true" />
      <div className="px-5 pb-8 pt-14">
        <div className="mx-auto max-w-6xl">
          <p aria-hidden="true" className="madras-text select-none font-heavy text-[clamp(3.5rem,20vw,11rem)] leading-[0.9] tracking-tight">
            2TIJEN
          </p>

          <div className="mt-10 grid gap-12 border-t border-line pt-10 lg:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <p className="font-heavy text-lg uppercase tracking-wide">{drop.slogan}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a className={social} href={drop.contact.instagram} {...external}>Instagram</a>
                <a className={social} href={drop.contact.tiktok} {...external}>TikTok</a>
                <a className={social} href={`https://wa.me/${drop.contact.whatsapp}`} {...external}>WhatsApp</a>
              </div>
            </div>

            <div>
              <p className={title}>Infos</p>
              <ul className="space-y-3 text-sm text-muted">
                <li>Précommande : fabrication après la clôture.</li>
                <li>Livraison estimée entre le {formatDay(from)} et le {formatDay(to, true)}.</li>
                <li><a className={`${link} text-ink`} href={`mailto:${drop.contact.email}`}>{drop.contact.email}</a></li>
              </ul>
            </div>

            <nav aria-label="Informations légales">
              <p className={title}>Légal</p>
              <ul className="space-y-3 text-sm">
                <li><Link className={link} href="/cgv">CGV</Link></li>
                <li><Link className={link} href="/retours">Retours et échanges</Link></li>
                <li><Link className={link} href="/mentions-legales">Mentions légales</Link></li>
                <li><Link className={link} href="/confidentialite">Confidentialité</Link></li>
              </ul>
            </nav>
          </div>

          <div className="mt-12 flex flex-col gap-5 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {drop.brand}</p>
            <ul className="flex flex-wrap items-center gap-2" aria-label="Moyens de paiement acceptés">
              {["Visa", "Mastercard", "Apple Pay", "Google Pay"].map((m) => (
                <li key={m} className="rounded-full border border-line px-3 py-1">{m}</li>
              ))}
              <li className="px-1">Paiement sécurisé par Stripe</li>
            </ul>
            <a href="#" className={`${link} text-ink`}>Retour en haut ↑</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
