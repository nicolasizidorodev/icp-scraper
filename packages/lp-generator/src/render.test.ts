import { describe, it, expect } from "vitest";
import { renderLandingHtml } from "./render.js";
import { slugify, landingSlug } from "./slug.js";
import type { LandingCopy } from "@icp/core";

const copy: LandingCopy = {
  hero: { headline: "Clínica X", subheadline: "Cuidado de verdade", ctaLabel: "Agendar no WhatsApp" },
  benefits: [
    { title: "Atendimento", description: "Rápido" },
    { title: "Equipe", description: "Qualificada" },
    { title: "Local", description: "Central" },
  ],
  procedures: [{ name: "Limpeza", description: "Profissional" }],
  team: [{ name: "Dra. Ana", role: "Dentista", placeholder: false }],
  testimonials: [{ author: "Cliente Exemplo", text: "Ótimo!", isExample: true }],
  faq: [{ question: "Aceita convênio?", answer: "Sim" }],
  contact: { whatsapp: "+55 (11) 99999-8888", address: "Rua A, 100" },
};

describe("renderLandingHtml", () => {
  const html = renderLandingHtml({ company: { name: "Clínica X" }, copy });

  it("é um documento HTML válido pt-BR responsivo", () => {
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain("width=device-width");
  });

  it("rotula depoimentos como exemplo de layout (guardrail)", () => {
    expect(html).toContain("exemplo de layout");
    expect(html.toLowerCase()).toContain("fictício");
  });

  it("gera link wa.me a partir do telefone", () => {
    expect(html).toContain("https://wa.me/5511999998888");
  });

  it("escapa HTML malicioso vindo da copy", () => {
    const evil = renderLandingHtml({
      company: { name: "<script>alert(1)</script>" },
      copy,
    });
    expect(evil).not.toContain("<script>alert(1)</script>");
    expect(evil).toContain("&lt;script&gt;");
  });

  it("embute mapa quando há endereço", () => {
    expect(html).toContain("maps.google.com/maps?q=");
  });
});

describe("slug", () => {
  it("remove acentos e normaliza", () => {
    expect(slugify("Açaí & Cia São Paulo")).toBe("acai-cia-sao-paulo");
  });
  it("landingSlug usa sufixo do id", () => {
    expect(landingSlug("Clínica X", "clxabc123456")).toBe("clinica-x-123456");
  });
});
