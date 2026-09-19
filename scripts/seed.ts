/**
 * Données de départ : crée les designs et leurs stocks à partir de config/drop.ts.
 *
 *   npm run seed
 *
 * Peut être relancé sans danger : il ajoute ce qui manque et met à jour les
 * stocks TOTAUX, mais ne touche jamais aux ventes déjà enregistrées.
 */
import { createClient } from "@supabase/supabase-js";
import { drop, SIZES, totalPiecesFor } from "../config/drop";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Il manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY. Lance : npm run seed (avec un fichier .env.local rempli).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

for (const d of drop.designs) {
  const { error } = await db.from("designs").upsert({ id: d.id, name: d.name, total_pieces: totalPiecesFor(d) }, { onConflict: "id" });
  if (error) throw new Error(`designs ${d.id} : ${error.message}`);

  for (const size of SIZES) {
    // On met à jour « total » seulement ; « sold » reste intact.
    const { error: e } = await db.from("stock").upsert({ design_id: d.id, size, total: d.stock[size] }, { onConflict: "design_id,size" });
    if (e) throw new Error(`stock ${d.id} ${size} : ${e.message}`);
  }
  console.log(`✔ ${d.name} : ${SIZES.map((s) => `${s}=${d.stock[s]}`).join(" ")} (total ${totalPiecesFor(d)})`);
}
console.log("Seed terminé.");
