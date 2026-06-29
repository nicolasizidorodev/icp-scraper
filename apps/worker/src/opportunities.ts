import { prisma, type Prisma } from "@icp/db";
import { childLogger } from "@icp/logger";
import { getProvider, generateOpportunities } from "@icp/ai";
import { deriveOpportunities, type OpportunityInput } from "@icp/scoring";
import { tryAi } from "./aiguard.js";
import type { OpportunitySeverity } from "@icp/core";

interface OppRow {
  title: string;
  detail: string;
  severity: OpportunitySeverity;
  evidence: Prisma.InputJsonValue;
}

/** Monta brief textual de diagnóstico (só fatos) p/ o LLM. */
function buildBrief(
  company: { name: string; category: string | null; rating: number | null; reviewCount: number | null },
  audit: Awaited<ReturnType<typeof loadData>>["audit"],
  seo: Awaited<ReturnType<typeof loadData>>["seo"],
  ad: Awaited<ReturnType<typeof loadData>>["ad"],
): string {
  const lines = [
    `Empresa: ${company.name}`,
    company.category && `Categoria: ${company.category}`,
    company.rating != null && `Avaliação Google: ${company.rating} (${company.reviewCount ?? 0} reviews)`,
  ].filter(Boolean) as string[];

  if (!audit || !audit.exists) {
    const k = audit?.linkKind;
    lines.push(
      k && k !== "site" && k !== "none"
        ? `Site: NÃO tem site real (link cadastrado é ${k}).`
        : "Site: NÃO POSSUI site próprio detectado.",
    );
  } else {
    lines.push(
      `Site: ${audit.finalUrl ?? "(url)"}`,
      `Performance: ${audit.perfScore ?? "?"}/100 | SEO: ${audit.seoScore ?? "?"}/100 | Responsivo: ${audit.responsive} | HTTPS: ${audit.ssl}`,
      `Marketing: pixel=${audit.hasMetaPixel} GA=${audit.hasGA} GTM=${audit.hasGTM} chat=${audit.hasChat}`,
      `Conversão: whatsapp=${audit.hasWhatsappBtn} agendamento=${audit.hasBooking} formulário=${audit.hasForms}`,
      `CMS/stack: ${audit.cms ?? "?"} ${audit.framework ?? ""}`,
    );
    if (seo) lines.push(`SEO meta: title="${seo.title ?? ""}" desc="${(seo.description ?? "").slice(0, 80)}"`);
  }
  if (ad?.runsAds) {
    lines.push(`Mídia paga: investe em anúncios (${ad.networks.join(", ") || "rede n/d"}${ad.activeAds != null ? `, ${ad.activeAds} ativos` : ""}).`);
  }
  return lines.join("\n");
}

async function loadData(companyId: string) {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { name: true, category: true, rating: true, reviewCount: true },
  });
  const audit = await prisma.websiteAudit.findUnique({ where: { companyId } });
  const seo = await prisma.seoAudit.findUnique({ where: { companyId } });
  const ad = await prisma.adProfile.findUnique({ where: { companyId } });
  return { company, audit, seo, ad };
}

function fallbackInput(
  audit: Awaited<ReturnType<typeof loadData>>["audit"],
  seo: Awaited<ReturnType<typeof loadData>>["seo"],
  ad: Awaited<ReturnType<typeof loadData>>["ad"],
): OpportunityInput {
  return {
    website:
      audit && audit.exists
        ? {
            exists: true,
            perfScore: audit.perfScore,
            seoScore: audit.seoScore,
            responsive: audit.responsive,
            ssl: audit.ssl,
            hasMetaPixel: audit.hasMetaPixel,
            hasGA: audit.hasGA,
            hasGTM: audit.hasGTM,
            hasBooking: audit.hasBooking,
            hasChat: audit.hasChat,
            hasWhatsappBtn: audit.hasWhatsappBtn,
            hasForms: audit.hasForms,
          }
        : null,
    seo: seo
      ? {
          title: seo.title,
          description: seo.description,
          hasSchema: audit?.hasSchema,
          hasOG: audit?.hasOG,
        }
      : undefined,
    hasRobots: audit?.hasRobots,
    hasSitemap: audit?.hasSitemap,
    runsAds: ad?.runsAds ?? false,
    linkKind: audit?.linkKind ?? null,
  };
}

/**
 * Estágio OPPORTUNITIES (F4): tenta LLM; sem chave/erro → fallback determinístico
 * por regra. Sempre entrega valor. Idempotente (substitui as da empresa).
 */
export async function runOpportunities(companyId: string, campaignId: string): Promise<number> {
  const log = childLogger({ stage: "opportunities", companyId });
  const { company, audit, seo, ad } = await loadData(companyId);

  let rows: OppRow[] = [];
  const brief = buildBrief(company, audit, seo, ad);

  const ai = await tryAi(
    campaignId,
    { tier: "bulk", inputText: brief, maxTokens: 2048, stage: "opportunities" },
    () => generateOpportunities(brief),
  );
  if (ai) {
    rows = ai.map((o) => ({
      title: o.title,
      detail: o.detail,
      severity: o.severity,
      evidence: { source: getProvider().name, note: o.evidence ?? null } as Prisma.InputJsonValue,
    }));
    log.info({ count: rows.length }, "oportunidades por IA");
  }

  if (rows.length === 0) {
    rows = deriveOpportunities(fallbackInput(audit, seo, ad)).map((o) => ({
      title: o.title,
      detail: o.detail,
      severity: o.severity,
      evidence: { source: "rule", ...o.evidence } as Prisma.InputJsonValue,
    }));
    log.info({ count: rows.length }, "oportunidades por regra (fallback)");
  }

  await prisma.$transaction([
    prisma.opportunity.deleteMany({ where: { companyId } }),
    ...rows.map((r) => prisma.opportunity.create({ data: { companyId, ...r } })),
  ]);

  return rows.length;
}
