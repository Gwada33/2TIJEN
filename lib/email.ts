import "server-only";
import { Resend } from "resend";
import { drop, getDesign } from "@/config/drop";
import { formatEuros } from "@/lib/format";
import { requireEnv, siteUrl } from "@/lib/env";

let resend: Resend | null = null;
const client = () => (resend ??= new Resend(requireEnv("RESEND_API_KEY")));

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Habillage commun des e-mails : simple, lisible, compatible avec tous les clients mail. */
function layout(title: string, body: string, footer = "") {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f4f2;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:16px;padding:28px">
    <p style="font-size:22px;font-weight:800;letter-spacing:.04em;margin:0 0 20px">${drop.brand}</p>
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${body}
  </div>
  <p style="font-size:12px;color:#666;text-align:center;margin:16px 0 0">${footer}</p>
</div></body></html>`;
}

async function send(to: string, subject: string, html: string) {
  const { error } = await client().emails.send({ from: drop.contact.emailFrom, to, subject, html });
  if (error) throw new Error(`Resend : ${error.message}`);
}

export type ConfirmationOrder = {
  email: string;
  name: string | null;
  deliveryMethod: "pickup" | "shipping" | null;
  amountTotal: number;
  items: { design_id: string; size: string; piece_number: number; total_pieces: number }[];
};

/** « 012/050 » */
export const formatPieceNumber = (n: number, total: number) =>
  `${String(n).padStart(3, "0")}/${String(total).padStart(3, "0")}`;

export async function sendOrderConfirmation(o: ConfirmationOrder) {
  const rows = o.items
    .map(
      (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(getDesign(i.design_id)?.name ?? i.design_id)}
        — taille ${escapeHtml(i.size)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700">N° ${formatPieceNumber(i.piece_number, i.total_pieces)}</td></tr>`,
    )
    .join("");
  const delivery =
    o.deliveryMethod === "shipping" ? drop.shipping.metropoleLabel : drop.shipping.pickupLabel;
  const html = layout(
    "Ta précommande est confirmée",
    `<p>Merci${o.name ? ` ${escapeHtml(o.name)}` : ""} ! Ta précommande ${drop.name} est bien enregistrée.
       Chaque pièce est numérotée, voici la tienne :</p>
     <table style="width:100%;border-collapse:collapse;font-size:15px">${rows}</table>
     <p style="font-size:16px"><strong>Total payé : ${formatEuros(o.amountTotal)}</strong><br>Livraison : ${escapeHtml(delivery)}</p>
     <p>Il s'agit d'une <strong>précommande</strong> : la fabrication démarre à la clôture.
        Délai annoncé : <strong>${drop.deliveryDelay}</strong>.</p>
     <p>Une question ? Réponds à cet e-mail ou écris-nous sur
        <a href="https://wa.me/${drop.contact.whatsapp}">WhatsApp</a> ou
        <a href="${drop.contact.instagram}">Instagram</a>.</p>`,
    drop.slogan,
  );
  await send(o.email, `${drop.brand} — précommande confirmée`, html);
}

export async function sendRefundNotice(email: string) {
  const html = layout(
    "Ta commande n'a pas pu être honorée",
    `<p>Désolé : pendant que tu payais, la dernière pièce que tu avais choisie a été vendue.
       Ton paiement a été <strong>remboursé automatiquement</strong> (quelques jours selon ta banque).</p>
     <p>Rendez-vous sur le site pour voir ce qu'il reste, ou inscris-toi à la liste d'attente pour le prochain drop.</p>`,
  );
  await send(email, `${drop.brand} — remboursement de ta commande`, html);
}

/** E-mail d'accès anticipé envoyé aux inscrits de la liste d'attente. */
export async function sendEarlyAccess(email: string, token: string, opensAtLabel: string) {
  const link = `${siteUrl()}/?acces=${token}`;
  const unsubscribe = `${siteUrl()}/desinscription?token=${token}`;
  const html = layout(
    "Ton accès anticipé de 24 h",
    `<p>Tu es sur la liste d'attente : tu peux précommander <strong>24 h avant tout le monde</strong>.
       Ouverture publique : ${escapeHtml(opensAtLabel)}.</p>
     <p style="margin:24px 0"><a href="${link}" style="background:#111;color:#fff;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:700">Accéder au drop</a></p>
     <p style="font-size:13px;color:#555">Ce lien est personnel, ne le partage pas.</p>`,
    `Tu reçois cet e-mail car tu t'es inscrit(e) à la liste d'attente.
     <a href="${unsubscribe}">Me désinscrire</a>`,
  );
  await send(email, `${drop.brand} — ton accès anticipé`, html);
}
