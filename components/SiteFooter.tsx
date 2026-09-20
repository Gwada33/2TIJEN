import Image from "next/image";
import Link from "next/link";
import { drop } from "@/config/drop";
import { estimatedDelivery, formatDay } from "@/lib/format";

/** Pied de page : marque, réseaux, pages légales, une ligne d'infos. */
export function SiteFooter() {
  const { from, to } = estimatedDelivery();
  const link = "inline-flex min-h-11 items-center underline-offset-4 hover:text-sun hover:underline";
  const social = "btn btn-ghost !min-h-11 !px-5 !text-[0.72rem]";
  const external = { rel: "noopener noreferrer", target: "_blank" } as const;
  return (
    <footer className="bg-night text-ink">
      <div className="madras" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:pt-20">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:gap-24">
          <div className="flex flex-col gap-8">
            <Link href="/" aria-label={`${drop.brand}, accueil`} className="flex items-center gap-3">
              <Image src="/logo-2t-white.png" alt="" width={40} height={40} className="h-9 w-auto" />
              <span className="font-heavy text-xl uppercase tracking-wide">{drop.brand}</span>
            </Link>
            <div className="flex flex-wrap gap-3">
              <a className={social} href={drop.contact.instagram} {...external}>Instagram</a>
              <a className={social} href={drop.contact.tiktok} {...external}>TikTok</a>
              <a className={social} href={`https://wa.me/${drop.contact.whatsapp}`} {...external}>WhatsApp</a>
            </div>
          </div>

          <nav aria-label="Informations légales">
            <ul className="grid grid-cols-2 gap-x-10 text-sm">
              <li><Link className={link} href="/cgv">CGV</Link></li>
              <li><Link className={link} href="/retours">Retours</Link></li>
              <li><Link className={link} href="/mentions-legales">Mentions légales</Link></li>
              <li><Link className={link} href="/confidentialite">Confidentialité</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs leading-relaxed text-muted sm:flex-row sm:justify-between">
          <p>Précommande · livraison estimée {formatDay(from)} – {formatDay(to, true)} · paiement sécurisé SumUp</p>
          <p>© {new Date().getFullYear()} {drop.brand}</p>
        </div>
      </div>
    </footer>
  );
}
