import type { IcpScoreResult, ScoreBreakdownItem } from "@icp/core";
import type { ScoringInput, WebsiteSignals } from "./types.js";

export const SCORING_VERSION = "v1";

// Filosofia (ADR-0007): pontuar PROBABILIDADE DE COMPRA, não só "precisa de site".
// Pesos somam 100. Critérios "intenção" = marketing + digitalGap + reachGap +
// consolidation; "reputation" entra separado como sub-score de confiança/caixa.
const WEIGHTS = {
  reputation: 25,
  marketing: 25,
  digitalGap: 25,
  reachGap: 15,
  consolidation: 10,
} as const;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** Reputação: nota (3★→0, 5★→1) + volume de avaliações (log, 500+ → 1). */
function rawReputation(rating?: number | null, reviewCount?: number | null): number {
  const ratingScore = rating ? clamp01((rating - 3) / 2) : 0;
  const volumeScore = reviewCount ? clamp01(Math.log10(reviewCount + 1) / Math.log10(500)) : 0;
  return 0.5 * ratingScore + 0.5 * volumeScore;
}

/** Investimento em marketing digital = sinal forte de disposição a pagar. */
function rawMarketing(w: WebsiteSignals | null): number {
  if (!w || !w.exists) return 0;
  const signals = [
    w.hasMetaPixel,
    w.hasGA,
    w.hasGTM,
    w.hasBooking,
    w.hasChat,
    w.hasWhatsappBtn,
  ];
  return signals.filter(Boolean).length / signals.length;
}

/** Gap digital = tamanho da oportunidade de venda (sem site = gap máximo). */
function rawDigitalGap(w: WebsiteSignals | null): number {
  if (!w || !w.exists) return 1;
  const gaps: number[] = [];
  if (w.perfScore != null) gaps.push((100 - w.perfScore) / 100);
  if (w.seoScore != null) gaps.push((100 - w.seoScore) / 100);
  gaps.push(w.responsive ? 0 : 1);
  gaps.push(w.ssl ? 0 : 1);
  return gaps.length ? clamp01(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0.5;
}

/** Gap de canais de conversão (whatsapp / agendamento / formulário). */
function rawReachGap(w: WebsiteSignals | null): number {
  if (!w || !w.exists) return 0.7; // tem demanda (GBP) mas zero canal próprio
  const missing = [!w.hasWhatsappBtn, !w.hasBooking, !w.hasForms].filter(Boolean).length;
  return missing / 3;
}

/** Consolidação: anos de atuação + volume (proxy de porte/caixa). */
function rawConsolidation(yearsActive?: number | null, reviewCount?: number | null): number {
  const ageScore = yearsActive ? clamp01(yearsActive / 10) : 0;
  const volumeScore = reviewCount ? clamp01(Math.log10(reviewCount + 1) / Math.log10(500)) : 0;
  return 0.5 * ageScore + 0.5 * volumeScore;
}

function item(raw: number, weight: number): ScoreBreakdownItem {
  const r = clamp01(raw);
  return { raw: Number(r.toFixed(3)), weight, points: Number((r * weight).toFixed(2)) };
}

/** Motor ICP v1 — puro, versionado, explicável. */
export function computeIcpScore(input: ScoringInput): IcpScoreResult {
  const reputation = item(rawReputation(input.rating, input.reviewCount), WEIGHTS.reputation);
  const marketing = item(rawMarketing(input.website), WEIGHTS.marketing);
  const digitalGap = item(rawDigitalGap(input.website), WEIGHTS.digitalGap);
  const reachGap = item(rawReachGap(input.website), WEIGHTS.reachGap);
  const consolidation = item(
    rawConsolidation(input.yearsActive, input.reviewCount),
    WEIGHTS.consolidation,
  );

  const breakdown: Record<string, ScoreBreakdownItem> = {
    reputation,
    marketing,
    digitalGap,
    reachGap,
    consolidation,
  };

  const total = Math.round(
    [reputation, marketing, digitalGap, reachGap, consolidation].reduce(
      (sum, b) => sum + b.points,
      0,
    ),
  );

  // Sub-score de intenção = critérios de propensão + oportunidade (sem reputação).
  const intentWeight = WEIGHTS.marketing + WEIGHTS.digitalGap + WEIGHTS.reachGap + WEIGHTS.consolidation;
  const intentPoints = marketing.points + digitalGap.points + reachGap.points + consolidation.points;
  const buyingIntent = Math.round((intentPoints / intentWeight) * 100);

  return {
    total,
    buyingIntent,
    reputation: Math.round(reputation.raw * 100),
    breakdown,
    scoringVersion: SCORING_VERSION,
  };
}
