import Link from "next/link";
import { drop } from "@/config/drop";

export function SiteFooter() {
  const link = "underline-offset-4 hover:underline";
  return (
    <footer className="bg-ink px-5 py-14 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3">
        <div>
          <p className="font-black text-3xl">{drop.brand}</p>
          <p className="mt-2 text-white/80">{drop.slogan}. Fait en Guadeloupe.</p>
        </div>
        <nav aria-label="Réseaux sociaux">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-white/70">Suis-nous</p>
          <ul className="space-y-2">
            <li><a className={link} href={drop.contact.instagram} rel="noopener noreferrer" target="_blank">Instagram</a></li>
            <li><a className={link} href={drop.contact.tiktok} rel="noopener noreferrer" target="_blank">TikTok</a></li>
            <li><a className={link} href={`https://wa.me/${drop.contact.whatsapp}`} rel="noopener noreferrer" target="_blank">WhatsApp</a></li>
          </ul>
        </nav>
        <nav aria-label="Informations légales">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-white/70">Infos</p>
          <ul className="space-y-2">
            <li><Link className={link} href="/cgv">Conditions générales de vente</Link></li>
            <li><Link className={link} href="/retours">Retours et échanges</Link></li>
            <li><Link className={link} href="/mentions-legales">Mentions légales</Link></li>
            <li><Link className={link} href="/confidentialite">Confidentialité</Link></li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-sm text-white/70">© {new Date().getFullYear()} {drop.brand}. Tous droits réservés.</p>
    </footer>
  );
}
