import type { PipelineStage } from "@icp/core";

// Nome de fila = estágio em minúsculo. Mantém 1:1 com PipelineStage.
export const QUEUES = {
  discover: "discover",
  dedupe: "dedupe",
  enrich: "enrich",
  analyze: "analyze",
  score: "score",
  opportunities: "opportunities",
  proposal: "proposal",
  landing: "landing",
  messages: "messages",
  finalize: "finalize",
} as const;

export type QueueName = keyof typeof QUEUES;

// Ordem canônica do pipeline (ver docs/ARCHITECTURE.md §4).
export const STAGE_ORDER: QueueName[] = [
  "discover",
  "dedupe",
  "enrich",
  "analyze",
  "score",
  "opportunities",
  "proposal",
  "landing",
  "messages",
  "finalize",
];

/** Estágios de nível-campanha (1 job por campanha). */
export const CAMPAIGN_STAGES = new Set<QueueName>(["discover", "dedupe"]);

/** Payload comum de jobs de nível-empresa. */
export interface CompanyJob {
  campaignId: string;
  companyId: string;
  scoringVersion: string;
}

/** Payload de jobs de nível-campanha. */
export interface CampaignJob {
  campaignId: string;
}

export type JobData = CampaignJob | CompanyJob;

export function isCompanyJob(d: JobData): d is CompanyJob {
  return "companyId" in d;
}

export function stageToPipeline(q: QueueName): PipelineStage {
  return q.toUpperCase() as PipelineStage;
}
