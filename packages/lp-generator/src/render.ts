import type { LandingCopy } from "@icp/core";
import { renderTemplate, type TemplateCtx } from "./template.js";
import { DEFAULT_TEMPLATE } from "./templates/default.js";

export interface RenderCompany {
  name: string;
  category?: string | null;
  address?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  city?: string | null;
  logoUrl?: string | null;
}

export interface RenderInput {
  company: RenderCompany;
  copy: LandingCopy;
  /** Paleta hex dominante (da análise visual). Fallback p/ tema neutro. */
  palette?: string[];
  /** Template HTML (desenhado no Stitch). Ausente → template default. */
  template?: string;
}

const DEFAULT_PALETTE = ["#0f172a", "#2563eb", "#f8fafc"];

/** Escapa HTML/atributo p/ evitar injeção a partir de conteúdo de IA/dados. */
function esc(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function waLink(num?: string | null): string | undefined {
  if (!num) return undefined;
  const digits = num.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : undefined;
}

/**
 * Renderiza a LandingCopy preenchendo um template (Stitch ou default).
 * Puro. Aplica guardrails legais (ADR-0006): depoimentos rotulados como exemplo;
 * todo dado é escapado antes de entrar no template.
 */
export function renderLandingHtml(input: RenderInput): string {
  const { company, copy } = input;
  const [c1 = DEFAULT_PALETTE[0]!, c2 = DEFAULT_PALETTE[1]!, c3 = DEFAULT_PALETTE[2]!] =
    input.palette && input.palette.length >= 2 ? input.palette : DEFAULT_PALETTE;

  const wa = waLink(copy.contact.whatsapp ?? company.whatsapp ?? company.phone);
  const address = copy.contact.address ?? company.address ?? null;
  const mapSrc = address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null;

  const title = `${company.name}${company.category ? ` — ${company.category}` : ""}`;

  const ctx: TemplateCtx = {
    scalars: {
      TITLE: esc(title),
      DESCRIPTION: esc(copy.hero.subheadline),
      COMPANY_NAME: esc(company.name),
      C1: esc(c1),
      C2: esc(c2),
      C3: esc(c3),
      HERO_HEADLINE: esc(copy.hero.headline),
      HERO_SUB: esc(copy.hero.subheadline),
      CTA_LABEL: esc(copy.hero.ctaLabel),
      CTA_HREF: wa ? esc(wa) : "#contato",
      ADDRESS: esc(address),
      MAP_SRC: mapSrc ? esc(mapSrc) : "",
      WA_HREF: wa ? esc(wa) : "",
      LOGO_URL: company.logoUrl ? esc(company.logoUrl) : "",
    },
    flags: {
      HAS_LOGO: !!company.logoUrl,
      HAS_WA: !!wa,
      HAS_MAP: !!mapSrc,
      HAS_ADDRESS: !!address,
      HAS_PROCEDURES: copy.procedures.length > 0,
      HAS_TEAM: copy.team.length > 0,
      HAS_TESTIMONIALS: copy.testimonials.length > 0,
      HAS_FAQ: copy.faq.length > 0,
    },
    sections: {
      BENEFITS: copy.benefits.map((b) => ({ title: esc(b.title), description: esc(b.description) })),
      PROCEDURES: copy.procedures.map((p) => ({ name: esc(p.name), description: esc(p.description) })),
      TEAM: copy.team.map((m) => ({
        name: esc(m.name),
        role: esc(m.role),
        tag: m.placeholder ? ' <span class="tag">exemplo</span>' : "",
      })),
      TESTIMONIALS: copy.testimonials.map((t) => ({ text: esc(t.text), author: esc(t.author) })),
      FAQ: copy.faq.map((f) => ({ question: esc(f.question), answer: esc(f.answer) })),
    },
  };

  return renderTemplate(input.template || DEFAULT_TEMPLATE, ctx);
}
