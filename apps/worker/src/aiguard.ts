import { getEnv } from "@icp/config";
import { childLogger } from "@icp/logger";
import { getProvider, resolveModel, estimateCostUsd, approxTokens, type ModelTier } from "@icp/ai";
import { hasBudget, addSpentUsd } from "@icp/queue";

/**
 * Executa uma tarefa de IA sob guarda: pula (retorna null) se não há provider
 * configurado OU se o orçamento da campanha estourou. Contabiliza custo estimado
 * (limite superior via maxTokens) após sucesso. null → caller usa fallback.
 */
export async function tryAi<T>(
  campaignId: string,
  opts: { tier: ModelTier; inputText: string; maxTokens: number; stage: string },
  fn: () => Promise<T>,
): Promise<T | null> {
  const log = childLogger({ stage: opts.stage, campaignId });
  const provider = getProvider();
  if (!(await provider.isReady())) return null;

  const limit = getEnv().LLM_BUDGET_USD_PER_CAMPAIGN;
  if (!(await hasBudget(campaignId, limit))) {
    log.warn({ limit }, "orçamento LLM da campanha esgotado — usando fallback");
    return null;
  }

  const model = resolveModel(opts.tier);
  const est = estimateCostUsd(model, approxTokens(opts.inputText) + 300, opts.maxTokens);

  try {
    const result = await fn();
    await addSpentUsd(campaignId, est);
    return result;
  } catch (err) {
    log.warn({ err }, "chamada de IA falhou — fallback");
    return null;
  }
}
