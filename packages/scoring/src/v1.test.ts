import { describe, it, expect } from "vitest";
import { computeIcpScore } from "./v1.js";
import { deriveOpportunities } from "./opportunities.js";
import type { ScoringInput, WebsiteSignals } from "./types.js";

const fullSite: WebsiteSignals = {
  exists: true,
  perfScore: 90,
  seoScore: 95,
  responsive: true,
  ssl: true,
  hasMetaPixel: true,
  hasGA: true,
  hasGTM: true,
  hasBooking: true,
  hasChat: true,
  hasWhatsappBtn: true,
  hasForms: true,
};

describe("computeIcpScore v1", () => {
  it("score sempre entre 0 e 100", () => {
    const r = computeIcpScore({ rating: 4.8, reviewCount: 300, website: fullSite });
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
    expect(r.scoringVersion).toBe("v1");
  });

  it("empresa com tração mas SEM site = alvo quente (gap alto)", () => {
    const hot: ScoringInput = { rating: 4.9, reviewCount: 400, website: null };
    const r = computeIcpScore(hot);
    expect(r.breakdown.digitalGap!.raw).toBe(1);
    expect(r.reputation).toBeGreaterThan(70);
    expect(r.buyingIntent).toBeGreaterThan(40);
  });

  it("site impecável + investe em marketing → menos gap, mais intenção provada", () => {
    const r = computeIcpScore({ rating: 4.7, reviewCount: 200, website: fullSite });
    expect(r.breakdown.marketing!.raw).toBe(1);
    expect(r.breakdown.digitalGap!.raw).toBeLessThan(0.2);
  });

  it("empresa sem reputação nem dados → score baixo", () => {
    const r = computeIcpScore({ website: null });
    expect(r.reputation).toBe(0);
    expect(r.total).toBeLessThan(60);
  });

  it("breakdown soma confere com total", () => {
    const r = computeIcpScore({ rating: 4.2, reviewCount: 50, website: fullSite });
    const sum = Object.values(r.breakdown).reduce((s, b) => s + b.points, 0);
    expect(Math.round(sum)).toBe(r.total);
  });
});

describe("deriveOpportunities", () => {
  it("sem site → 1 oportunidade CRITICAL", () => {
    const ops = deriveOpportunities({ website: null });
    expect(ops).toHaveLength(1);
    expect(ops[0]!.severity).toBe("CRITICAL");
  });

  it("site cheio de gaps → várias oportunidades específicas", () => {
    const broken: WebsiteSignals = {
      exists: true,
      perfScore: 25,
      seoScore: 40,
      responsive: false,
      ssl: false,
      hasMetaPixel: false,
      hasGA: false,
      hasGTM: false,
      hasBooking: false,
      hasChat: false,
      hasWhatsappBtn: false,
      hasForms: false,
    };
    const ops = deriveOpportunities({ website: broken, hasSitemap: false });
    const titles = ops.map((o) => o.title);
    expect(titles).toContain("Site não responsivo (mobile)");
    expect(titles).toContain("Site sem HTTPS");
    expect(titles).toContain("Sem canal de conversão");
    expect(ops.every((o) => o.detail.length > 20)).toBe(true);
  });

  it("site perfeito → nenhuma oportunidade", () => {
    expect(deriveOpportunities({ website: fullSite, hasSitemap: true })).toHaveLength(0);
  });
});
