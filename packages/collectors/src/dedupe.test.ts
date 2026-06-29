import { describe, it, expect } from "vitest";
import { dedupeKey, mergeDrafts } from "./dedupe.js";
import type { CompanyDraft } from "@icp/core";

const base = (over: Partial<CompanyDraft>): CompanyDraft => ({
  name: "Clínica X",
  source: "places",
  raw: {},
  ...over,
});

describe("dedupeKey", () => {
  it("prioriza googlePlaceId", () => {
    expect(dedupeKey(base({ googlePlaceId: "abc", website: "https://x.com" }))).toBe("place:abc");
  });

  it("usa domínio quando não há placeId", () => {
    expect(dedupeKey(base({ website: "https://www.Clinica-X.com/ag" }))).toBe("dom:clinica-x.com");
  });

  it("cai para telefone (últimos 9 dígitos)", () => {
    expect(dedupeKey(base({ phone: "+55 (19) 99876-5432" }))).toBe("tel:998765432");
  });

  it("último recurso: nome+cidade normalizados sem acento", () => {
    expect(dedupeKey(base({ name: "Estética São José", city: "Campinas" }))).toBe(
      "nc:esteticasaojose:campinas",
    );
  });

  it("mesma empresa por placeId gera mesma chave", () => {
    const a = dedupeKey(base({ googlePlaceId: "p1", phone: "111" }));
    const b = dedupeKey(base({ googlePlaceId: "p1", phone: "222" }));
    expect(a).toBe(b);
  });
});

describe("mergeDrafts", () => {
  it("preenche campos faltantes a partir do segundo draft", () => {
    const a = base({ name: "X", website: undefined, instagram: undefined });
    const b = base({ website: "https://x.com", instagram: "@x", rating: 4.8 });
    const m = mergeDrafts(a, b);
    expect(m.website).toBe("https://x.com");
    expect(m.instagram).toBe("@x");
    expect(m.rating).toBe(4.8);
  });

  it("não sobrescreve campo já presente no primeiro", () => {
    const a = base({ website: "https://keep.com" });
    const b = base({ website: "https://override.com" });
    expect(mergeDrafts(a, b).website).toBe("https://keep.com");
  });
});
