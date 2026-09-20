import { describe, expect, it } from "vitest";
import { parseCustomer } from "@/lib/customer";

const ok = { email: " Jean@Mail.FR ", name: "  Jean   Dupont ", phone: "" };
const address = { line1: "12 rue des Lilas", postal_code: "75011", city: "Paris" };

describe("coordonnées du client", () => {
  it("retrait : e-mail et nom suffisent, l'adresse est ignorée", () => {
    const r = parseCustomer({ ...ok, address }, "pickup");
    expect(r).toEqual({ ok: true, customer: { email: "jean@mail.fr", name: "Jean Dupont", phone: null, address: null } });
  });

  it("envoi : l'adresse est obligatoire et le pays est fixé par le site", () => {
    expect(parseCustomer(ok, "shipping")).toMatchObject({ ok: false });
    expect(parseCustomer({ ...ok, address: { ...address, city: "" } }, "shipping")).toMatchObject({ ok: false });
    const r = parseCustomer({ ...ok, address: { ...address, country: "US" } }, "shipping");
    expect(r).toMatchObject({ ok: true, customer: { address: { ...address, country: "FR" } } });
  });

  it("refuse un e-mail, un nom ou un téléphone invalide", () => {
    expect(parseCustomer({ ...ok, email: "pas-un-mail" }, "pickup")).toMatchObject({ ok: false });
    expect(parseCustomer({ ...ok, name: "J" }, "pickup")).toMatchObject({ ok: false });
    expect(parseCustomer({ ...ok, phone: "abc" }, "pickup")).toMatchObject({ ok: false });
    expect(parseCustomer({ ...ok, phone: "+590 690 00 00 00" }, "pickup")).toMatchObject({ ok: true });
    expect(parseCustomer(undefined, "pickup")).toMatchObject({ ok: false });
  });
});
