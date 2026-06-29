import type { DerivedOpportunity } from "./types.js";
import type { WebsiteSignals } from "./types.js";

/** Sinais SEO opcionais p/ regras de oportunidade (subconjunto de SeoAudit). */
export interface SeoSignals {
  title?: string | null;
  description?: string | null;
  missingH1?: boolean;
  multipleH1?: boolean;
  hasSchema?: boolean;
  hasOG?: boolean;
}

export interface OpportunityInput {
  website: WebsiteSignals | null;
  seo?: SeoSignals;
  hasRobots?: boolean;
  hasSitemap?: boolean;
}

/**
 * Fallback determinístico (sem IA): deriva oportunidades específicas dos gaps
 * da auditoria. Garante que o pipeline entregue valor mesmo sem chave de LLM.
 * Cada item cita a evidência exata — nunca genérico.
 */
export function deriveOpportunities(input: OpportunityInput): DerivedOpportunity[] {
  const out: DerivedOpportunity[] = [];
  const w = input.website;

  if (!w || !w.exists) {
    out.push({
      title: "Empresa sem site próprio",
      detail:
        "Não foi encontrado site institucional. Toda a presença depende de perfis de terceiros — sem ativo digital próprio para captar e converter clientes.",
      severity: "CRITICAL",
      evidence: { websiteExists: false },
    });
    return out;
  }

  if (w.responsive === false) {
    out.push({
      title: "Site não responsivo (mobile)",
      detail:
        "A página não declara viewport mobile. A maioria das buscas locais vem de celular — layout quebrado nesses dispositivos derruba a conversão.",
      severity: "HIGH",
      evidence: { responsive: false },
    });
  }
  if (w.ssl === false) {
    out.push({
      title: "Site sem HTTPS",
      detail:
        "Conexão não segura (sem SSL). Navegadores marcam o site como 'não seguro', afastando visitantes e prejudicando o ranqueamento.",
      severity: "HIGH",
      evidence: { ssl: false },
    });
  }
  if (typeof w.perfScore === "number" && w.perfScore < 50) {
    out.push({
      title: "Desempenho ruim (carregamento lento)",
      detail: `Score de performance ${w.perfScore}/100 no PageSpeed. Páginas lentas aumentam a taxa de abandono antes mesmo do conteúdo carregar.`,
      severity: w.perfScore < 30 ? "HIGH" : "MEDIUM",
      evidence: { perfScore: w.perfScore },
    });
  }
  if (typeof w.seoScore === "number" && w.seoScore < 70) {
    out.push({
      title: "SEO técnico fraco",
      detail: `Score de SEO ${w.seoScore}/100. O site aparece pouco nas buscas orgânicas, perdendo clientes que procuram pelo serviço na região.`,
      severity: "MEDIUM",
      evidence: { seoScore: w.seoScore },
    });
  }
  if (!w.hasMetaPixel && !w.hasGA && !w.hasGTM) {
    out.push({
      title: "Sem rastreamento/pixel de marketing",
      detail:
        "Nenhum pixel (Meta) ou analytics (GA/GTM) detectado. Impossível medir resultados ou rodar campanhas de remarketing — investimento em mídia fica cego.",
      severity: "MEDIUM",
      evidence: { hasMetaPixel: false, hasGA: false, hasGTM: false },
    });
  }
  if (!w.hasWhatsappBtn && !w.hasForms && !w.hasBooking) {
    out.push({
      title: "Sem canal de conversão",
      detail:
        "Não há botão de WhatsApp, formulário nem agendamento. O visitante interessado não tem ação clara para virar contato/lead.",
      severity: "HIGH",
      evidence: { hasWhatsappBtn: false, hasForms: false, hasBooking: false },
    });
  }

  const seo = input.seo;
  if (seo) {
    if (!seo.title || !seo.description) {
      out.push({
        title: "Meta tags incompletas",
        detail:
          "Título ou meta description ausentes. O Google exibe o resultado de forma pobre, reduzindo cliques na busca.",
        severity: "MEDIUM",
        evidence: { title: seo.title ?? null, description: seo.description ?? null },
      });
    }
    if (seo.missingH1) {
      out.push({
        title: "Página sem H1",
        detail: "Nenhum cabeçalho H1 encontrado — estrutura semântica fraca prejudica SEO.",
        severity: "LOW",
        evidence: { missingH1: true },
      });
    }
  }
  if (input.hasSitemap === false) {
    out.push({
      title: "Sem sitemap.xml",
      detail: "Sitemap ausente dificulta a indexação completa do site pelos buscadores.",
      severity: "LOW",
      evidence: { hasSitemap: false },
    });
  }

  return out;
}
