import { describe, expect, it } from "vitest";
import type { PromoCodeConfig } from "@/config/drop";
import { lookupPromo } from "@/lib/promo";

const NOW = new Date("2026-10-13T10:00:00-04:00");
const codes: PromoCodeConfig[] = [
  { code: "DIX", label: "−10 %", percentOff: 10 },
  { code: "CINQ", amountOff: 500 },
  { code: "GROS", percentOff: 20, minSubtotal: 6000 },
  { code: "VIEUX", percentOff: 50, expiresAt: "2026-10-01T00:00:00-04:00" },
];

describe("codes de réduction", () => {
  it("remise en pourcentage, arrondie au centime", () => {
    const r = lookupPromo("dix", 6500, NOW, codes);
    expect(r).toEqual({ ok: true, promo: { code: "DIX", label: "−10 %", discount: 650 } });
    expect(lookupPromo(" DIX ", 3333, NOW, codes)).toMatchObject({ ok: true, promo: { discount: 333 } });
  });

  it("remise en euros, jamais supérieure au total", () => {
    expect(lookupPromo("CINQ", 3500, NOW, codes)).toMatchObject({ ok: true, promo: { discount: 500, label: "CINQ" } });
    expect(lookupPromo("CINQ", 300, NOW, codes)).toMatchObject({ ok: true, promo: { discount: 300 } });
  });

  it("refuse un code inconnu ou mal formé", () => {
    for (const c of ["NOPE", "", "  ", "a", "DIX; DROP", 42, null]) expect(lookupPromo(c, 3500, NOW, codes)).toMatchObject({ ok: false });
  });

  it("respecte le minimum d'achat et l'expiration", () => {
    expect(lookupPromo("GROS", 3500, NOW, codes)).toMatchObject({ ok: false, error: expect.stringContaining("au moins") });
    expect(lookupPromo("GROS", 7000, NOW, codes)).toMatchObject({ ok: true, promo: { discount: 1400 } });
    expect(lookupPromo("VIEUX", 7000, NOW, codes)).toMatchObject({ ok: false, error: "Ce code a expiré." });
  });

  it("aucun code n'existe tant que la liste du drop est vide", () => {
    expect(lookupPromo("DIX", 3500, NOW)).toMatchObject({ ok: false });
  });
});
