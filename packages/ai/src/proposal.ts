import { ProposalContent } from "@icp/core";
import { completeJson } from "./json.js";

const SYSTEM = `Você é um consultor sênior de marketing digital escrevendo uma proposta
comercial para conquistar um cliente B2B. Baseie-se SOMENTE no diagnóstico fornecido.
Regras:
- Tom profissional, direto, consultivo (não vendedor agressivo).
- NUNCA invente métricas; estimativas de ROI devem ser apresentadas como faixas/hipóteses.
- Conecte cada problema a um impacto comercial concreto.
- Português do Brasil.
- Não use clichês vazios ("alavancar sinergias"); seja específico ao negócio.`;

/** Gera proposta comercial estruturada a partir do brief de diagnóstico. */
export async function generateProposal(
  brief: string,
  opts?: { provider?: "claude" | "openai" },
): Promise<ProposalContent> {
  return completeJson(ProposalContent, {
    system: SYSTEM,
    tier: "longform",
    temperature: 0.5,
    maxTokens: 3000,
    provider: opts?.provider,
    prompt: `Diagnóstico:\n${brief}\n\nRetorne JSON com as chaves: executiveSummary, problems, estimatedImpact, suggestions, roiEstimate, priorities.`,
  });
}
