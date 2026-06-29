import { getConnection } from "./connection.js";

// Guard de orçamento LLM por campanha. Acumula custo estimado no Redis.
const key = (campaignId: string) => `llm:budget:${campaignId}`;
const TTL_SEC = 60 * 60 * 24 * 30; // 30 dias

/** Total já gasto (USD estimado) na campanha. */
export async function getSpentUsd(campaignId: string): Promise<number> {
  const v = await getConnection().get(key(campaignId));
  return v ? parseFloat(v) : 0;
}

/** Soma custo estimado ao acumulado da campanha. */
export async function addSpentUsd(campaignId: string, usd: number): Promise<void> {
  const conn = getConnection();
  await conn.incrbyfloat(key(campaignId), usd);
  await conn.expire(key(campaignId), TTL_SEC);
}

/** true se ainda há orçamento (gasto abaixo do limite). */
export async function hasBudget(campaignId: string, limitUsd: number): Promise<boolean> {
  if (limitUsd <= 0) return true; // 0/negativo = sem limite
  return (await getSpentUsd(campaignId)) < limitUsd;
}
