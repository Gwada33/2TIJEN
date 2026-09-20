import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { amountToCents, buildCheckoutBody, centsToAmount, createCheckout, getCheckout, refundTransaction } from "@/lib/sumup";

const base = {
  merchantCode: "MC123",
  reference: "3f2c1a0e-0000-4000-8000-000000000001",
  amountCents: 6590,
  redirectUrl: "https://x.fr/merci?ref=abc",
  returnUrl: "https://x.fr/api/webhooks/sumup",
  validUntil: new Date("2026-10-13T14:15:00Z"),
};

describe("paiement SumUp : corps de la requête", () => {
  it("convertit les centimes en euros décimaux, sans erreur d'arrondi", () => {
    expect(centsToAmount(6590)).toBe(65.9);
    expect(centsToAmount(3500)).toBe(35);
    expect(centsToAmount(1)).toBe(0.01);
    expect(amountToCents(65.9)).toBe(6590);
    expect(amountToCents(0.29)).toBe(29); // 0.29 * 100 = 28.999… en flottant
  });

  it("construit un paiement hébergé en EUR avec la référence et les adresses", () => {
    const b = buildCheckoutBody(base);
    expect(b).toMatchObject({
      merchant_code: "MC123",
      checkout_reference: base.reference,
      amount: 65.9,
      currency: "EUR",
      redirect_url: base.redirectUrl,
      return_url: base.returnUrl,
      valid_until: "2026-10-13T14:15:00.000Z",
      hosted_checkout: { enabled: true },
    });
    expect(b.checkout_reference.length).toBeLessThanOrEqual(64);
  });

  it("refuse un montant nul, négatif ou non entier", () => {
    for (const amountCents of [0, -100, 12.5, Number.NaN]) expect(() => buildCheckoutBody({ ...base, amountCents })).toThrow();
  });
});

describe("appels à l'API SumUp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  const stub = (response: { ok?: boolean; status?: number; json?: unknown; text?: string }) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.json,
      text: async () => response.text ?? "",
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("SUMUP_API_KEY", "sup_sk_test");
    vi.stubEnv("SUMUP_MERCHANT_CODE", "MC123");
    return fetchMock;
  };

  it("crée le paiement avec la clé en Bearer et renvoie l'adresse de la page de paiement", async () => {
    const f = stub({ status: 201, json: { id: "co_1", hosted_checkout_url: "https://checkout.sumup.com/pay/co_1" } });
    const { merchantCode: _ignored, ...args } = base;
    void _ignored;
    expect(await createCheckout(args)).toEqual({ id: "co_1", url: "https://checkout.sumup.com/pay/co_1" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.sumup.com/v0.1/checkouts");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer sup_sk_test");
    expect(JSON.parse(init.body).merchant_code).toBe("MC123");
  });

  it("échoue clairement si SumUp ne renvoie pas de page de paiement", async () => {
    stub({ status: 201, json: { id: "co_1" } });
    const { merchantCode: _ignored, ...args } = base;
    void _ignored;
    await expect(createCheckout(args)).rejects.toThrow(/page de paiement/);
  });

  it("remonte l'erreur HTTP de SumUp", async () => {
    stub({ ok: false, status: 401, text: "unauthorized" });
    await expect(getCheckout("co_1")).rejects.toThrow(/401/);
  });

  it("lit l'état d'un paiement", async () => {
    const f = stub({ json: { id: "co_1", status: "PAID", amount: 65.9, currency: "EUR", checkout_reference: "r", transactions: [{ id: "t1", status: "SUCCESSFUL", amount: 65.9 }] } });
    const c = await getCheckout("co_1");
    expect(c.status).toBe("PAID");
    expect(f.mock.calls[0][0]).toBe("https://api.sumup.com/v0.1/checkouts/co_1");
  });

  it("rembourse une transaction (montant complet)", async () => {
    const f = stub({ json: {} });
    await refundTransaction("t1");
    expect(f.mock.calls[0][0]).toBe("https://api.sumup.com/v1.0/merchants/MC123/payments/t1/refunds");
    expect(f.mock.calls[0][1].method).toBe("POST");
  });
});
