import Link from "next/link";
import { drop } from "@/config/drop";
import { estimatedDelivery, formatDay } from "@/lib/format";

/** Pied de page : réseaux, pages légales, une ligne d'infos. */
export function SiteFooter() {
  const { from, to } = estimatedDelivery();
  const link = "underline-offset-4 hover:text-sun hover:underline";
  const social = "btn btn-ghost !min-h-11 !px-5 !text-[0.72rem]";
  const external = { rel: "noopener noreferrer", target: "_blank" } as const;
  return (
    <footer className="bg-night text-ink">
      <div className="madras" aria-hidden="true" />
      <div className="px-5 pb-8 pt-14">
        <div className="mx-auto max-w-6xl">
          <p aria-hidden="true" className="madras-text select-none font-heavy text-[clamp(3.5rem,20vw,11rem)] leading-[0.9] tracking-tight">
            2TIJEN
          </p>

          <div className="mt-10 flex flex-col gap-6 border-t border-line pt-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <a className={social} href={drop.contact.instagram} {...external}>Instagram</a>
              <a className={social} href={drop.contact.tiktok} {...external}>TikTok</a>
              <a className={social} href={`https://wa.me/${drop.contact.whatsapp}`} {...external}>WhatsApp</a>
            </div>
            <nav aria-label="Informations légales">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <li><Link className={link} href="/cgv">CGV</Link></li>
                <li><Link className={link} href="/retours">Retours</Link></li>
                <li><Link className={link} href="/mentions-legales">Mentions légales</Link></li>
                <li><Link className={link} href="/confidentialite">Confidentialité</Link></li>
              </ul>
            </nav>
          </div>

          <div className="mt-8 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:justify-between">
            <p>Précommande · livraison estimée {formatDay(from)} – {formatDay(to, true)} · paiement sécurisé Stripe</p>
            <p>© {new Date().getFullYear()} {drop.brand}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
