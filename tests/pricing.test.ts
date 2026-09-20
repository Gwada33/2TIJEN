import { describe, expect, it } from "vitest";
import { computeQuote, validateCart, CartError } from "@/lib/pricing";
import { canPurchase, getPhase, isEarlyAccessWindow } from "@/lib/drop-state";
import { drop } from "@/config/drop";

const during = new Date("2026-10-15T12:00:00-04:00"); // après les 48 h early bird
const opening = new Date("2026-10-12T18:30:00-04:00"); // dans les 48 h
// L'early bird est désactivé dans la config : on le réactive ici pour tester son moteur.
const EB = { prices: drop.prices, earlyBird: { ...drop.earlyBird, enabled: true } };

describe("prix", () => {
  it("early bird désactivé (config actuelle) : prix normal même à l'ouverture", () => {
    expect(drop.earlyBird.enabled).toBe(false);
    const q = computeQuote([{ designId: "guadeloupean", size: "M", qty: 1 }], 0, opening);
    expect(q.total).toBe(3500);
  });

  it("prix normal après les 48 h", () => {
    const q = computeQuote([{ designId: "guadeloupean", size: "M", qty: 1 }], 0, during);
    expect(q.total).toBe(3500);
  });

  it("early bird : 32 € dans les 48 h et sous les 15 pièces", () => {
    const q = computeQuote([{ designId: "guadeloupean", size: "M", qty: 1 }], 0, opening, EB);
    expect(q.total).toBe(3200);
  });

  it("early bird : la 15e pièce est à 32 €, la 16e à 35 €", () => {
    const q = computeQuote([{ designId: "guadeloupean", size: "M", qty: 3 }], 13, opening, EB);
    expect(q.units.map((u) => u.unitAmount)).toEqual([3200, 3200, 3500]);
    expect(q.total).toBe(3200 * 2 + 3500);
  });

  it("early bird terminé après la 15e pièce", () => {
    const q = computeQuote([{ designId: "guadeloupean", size: "M", qty: 1 }], 15, opening, EB);
    expect(q.total).toBe(3500);
  });

  it("pack à 65 € pour un design de chaque (hors early bird)", () => {
    const q = computeQuote(
      [
        { designId: "guadeloupean", size: "M", qty: 1 },
        { designId: "martinican", size: "L", qty: 1 },
      ],
      20,
      during,
    );
    expect(q.total).toBe(6500);
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0].kind).toBe("pack");
    expect(q.units.reduce((s, u) => s + u.allocatedAmount, 0)).toBe(6500);
  });

  it("early bird x2 (64 €) est moins cher que le pack : on garde le meilleur prix", () => {
    const q = computeQuote(
      [
        { designId: "guadeloupean", size: "M", qty: 1 },
        { designId: "martinican", size: "L", qty: 1 },
      ],
      0,
      opening,
      EB,
    );
    expect(q.total).toBe(6400);
  });

  it("2 + 1 pièces : un pack + une pièce seule", () => {
    const q = computeQuote(
      [
        { designId: "guadeloupean", size: "M", qty: 2 },
        { designId: "martinican", size: "L", qty: 1 },
      ],
      20,
      during,
    );
    expect(q.total).toBe(6500 + 3500);
  });
});

describe("validation du panier", () => {
  it("refuse design ou taille inconnus, quantités folles, panier vide", () => {
    expect(() => validateCart([])).toThrow(CartError);
    expect(() => validateCart([{ designId: "nope", size: "M", qty: 1 }])).toThrow(CartError);
    expect(() => validateCart([{ designId: "guadeloupean", size: "XXL", qty: 1 }])).toThrow(CartError);
    expect(() => validateCart([{ designId: "guadeloupean", size: "M", qty: 99 }])).toThrow(CartError);
    expect(() => validateCart([{ designId: "guadeloupean", size: "M", qty: 1.5 }])).toThrow(CartError);
  });

  it("ignore un éventuel prix envoyé par le navigateur", () => {
    const cart = validateCart([{ designId: "guadeloupean", size: "M", qty: 1, price: 1 }]);
    expect(cart[0]).toEqual({ designId: "guadeloupean", size: "M", qty: 1 });
  });
});

describe("états du drop", () => {
  it("avant / ouvert / clos", () => {
    expect(getPhase(new Date("2026-10-01T00:00:00-04:00"))).toBe("before");
    expect(getPhase(new Date("2026-10-12T18:00:00-04:00"))).toBe("open");
    expect(getPhase(new Date("2026-10-22T00:00:00-04:00"))).toBe("closed");
  });

  it("accès anticipé : 24 h avant l'ouverture, avec jeton seulement", () => {
    const early = new Date("2026-10-12T00:00:00-04:00"); // 18 h avant l'ouverture
    const tooEarly = new Date("2026-10-11T12:00:00-04:00"); // 30 h avant
    expect(isEarlyAccessWindow(early)).toBe(true);
    expect(canPurchase(early, true)).toBe(true);
    expect(canPurchase(early, false)).toBe(false);
    expect(canPurchase(tooEarly, true)).toBe(false);
  });
});
