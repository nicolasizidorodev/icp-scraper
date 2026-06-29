// Estimativa de custo de chamadas LLM p/ o guard de orçamento por campanha.
// Preços aproximados (USD por 1M tokens) — ajuste conforme o provedor/contrato.
// Casados por substring do nome do modelo; fallback conservador no fim.

interface Price {
  in: number;
  out: number;
}

const TABLE: { match: RegExp; price: Price }[] = [
  { match: /opus/i, price: { in: 15, out: 75 } },
  { match: /sonnet/i, price: { in: 3, out: 15 } },
  { match: /haiku/i, price: { in: 0.8, out: 4 } },
  { match: /gpt-4o-mini|gpt-4\.1-mini|o4-mini/i, price: { in: 0.15, out: 0.6 } },
  { match: /gpt-4o|gpt-4\.1|gpt-4/i, price: { in: 2.5, out: 10 } },
];

const FALLBACK: Price = { in: 5, out: 15 };

function priceFor(model: string): Price {
  return TABLE.find((t) => t.match.test(model))?.price ?? FALLBACK;
}

/** Aproxima a contagem de tokens (~4 chars/token). */
export function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Custo estimado em USD de uma chamada (entrada + saída). */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = priceFor(model);
  const usd = (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
  return Number(usd.toFixed(6));
}
