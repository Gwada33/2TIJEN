import { formatAddress, loadAdminData } from "@/lib/admin-data";
import { isAdmin } from "@/lib/admin-auth";
import { toCsv } from "@/lib/csv";

export async function GET() {
  if (!(await isAdmin())) return new Response("Non autorisé", { status: 401 });
  const { orders } = await loadAdminData();
  const csv = toCsv(
    ["Date", "Nom", "E-mail", "Téléphone", "Livraison", "Adresse", "Pièces (design taille n°)", "Montant (€)", "Statut"],
    orders.map((o) => [
      o.created_at,
      o.name,
      o.email,
      o.phone,
      o.delivery_method === "shipping" ? "Envoi" : "Main propre",
      formatAddress(o.shipping_address),
      o.order_items.map((i) => `${i.design_id} ${i.size} n°${i.piece_number}`).join(" | "),
      (o.amount_total / 100).toFixed(2).replace(".", ","),
      o.status,
    ]),
  );
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="commandes-2tijen.csv"', "Cache-Control": "no-store" },
  });
}
