import { z } from "zod";
import { completeJson } from "./json.js";

export const AiOpportunity = z.object({
  title: z.string().min(3).max(120),
  detail: z.string().min(20),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  evidence: z.string().optional(),
});
export type AiOpportunity = z.infer<typeof AiOpportunity>;

export const AiOpportunityList = z.object({
  opportunities: z.array(AiOpportunity).max(12),
});

const SYSTEM = `Você é um consultor de marketing digital B2B. A partir do diagnóstico
de uma empresa, identifique oportunidades REAIS e ESPECÍFICAS de melhoria que
justifiquem uma proposta comercial. Regras rígidas:
- NUNCA invente dados; baseie-se só no diagnóstico fornecido.
- NUNCA escreva oportunidades genéricas ("ter presença online"); cite o achado concreto.
- Cada oportunidade deve ter impacto comercial claro (mais clientes/conversão/credibilidade).
- Severidade: CRITICAL (perda grave/ausência total), HIGH, MEDIUM, LOW.
- Português do Brasil. Máximo 8 oportunidades, ordenadas por severidade.`;

/**
 * Gera oportunidades específicas via LLM a partir de um brief de diagnóstico.
 * O brief deve conter só fatos da empresa (sem PII sensível desnecessária).
 */
export async function generateOpportunities(
  brief: string,
  opts?: { provider?: "claude" | "openai" },
): Promise<AiOpportunity[]> {
  const { opportunities } = await completeJson(AiOpportunityList, {
    system: SYSTEM,
    tier: "bulk",
    temperature: 0.3,
    maxTokens: 2048,
    provider: opts?.provider,
    prompt: `Diagnóstico da empresa:\n${brief}\n\nRetorne JSON: {"opportunities":[{"title","detail","severity","evidence"}]}`,
  });
  return opportunities;
}
