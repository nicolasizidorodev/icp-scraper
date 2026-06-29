import { prisma } from "@icp/db";
import { childLogger } from "@icp/logger";
import { getProvider, generateProposal } from "@icp/ai";
import type { ProposalContent } from "@icp/core";
import { buildCompanyBrief } from "./brief.js";
import { tryAi } from "./aiguard.js";

/** Proposta determinística a partir das oportunidades (fallback sem IA). */
async function fallbackProposal(companyId: string, name: string): Promise<ProposalContent> {
  const ops = await prisma.opportunity.findMany({
    where: { companyId },
    orderBy: { severity: "desc" },
  });
  const list = ops.map((o) => `• ${o.title}: ${o.detail}`).join("\n") || "Nenhum gap crítico identificado.";
  const top = ops.slice(0, 3).map((o) => o.title).join("; ") || "fortalecer presença digital";

  return {
    executiveSummary: `Diagnóstico digital de ${name}. Identificamos pontos concretos que, ajustados, ampliam a captação de clientes pelos canais online. Esta proposta resume os achados e o caminho de melhoria priorizado.`,
    problems: list,
    estimatedImpact:
      "Corrigir os gaps acima tende a aumentar a visibilidade nas buscas locais e a taxa de conversão de visitantes em contatos. Impacto exato depende do volume atual de tráfego.",
    suggestions: `Plano sugerido, em ordem de prioridade: ${top}. Cada item é executável de forma incremental, começando pelos de maior severidade.`,
    roiEstimate:
      "Estimativa hipotética: recuperar 10–20% dos visitantes hoje perdidos por falhas técnicas já cobre o investimento inicial em poucos meses (faixa, não garantia).",
    priorities: top,
  };
}

/** Estágio PROPOSAL (F6): proposta comercial (IA → fallback por regra). */
export async function runProposal(companyId: string, campaignId: string): Promise<void> {
  const log = childLogger({ stage: "proposal", companyId });
  const { brief, company } = await buildCompanyBrief(companyId);

  const ai = await tryAi(
    campaignId,
    { tier: "longform", inputText: brief, maxTokens: 3000, stage: "proposal" },
    () => generateProposal(brief),
  );

  const content: ProposalContent = ai ?? (await fallbackProposal(companyId, company.name));
  const generatedBy = ai ? getProvider().name : "rule:fallback";

  await prisma.proposal.upsert({
    where: { companyId },
    create: { companyId, ...content, generatedBy },
    update: { ...content, generatedBy },
  });
  log.info({ via: generatedBy }, "PROPOSAL gravada");
}
