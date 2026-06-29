// Tipos de domínio compartilhados. Desacoplados do Prisma client.
// Fonte da verdade dos contratos entre packages (ver docs/MODULE-CONTRACTS.md).

export type SourceName = "places" | "website" | "cnpj" | "social" | "apify";

export type AuditStatus = "PENDING" | "OK" | "PARTIAL" | "FAILED";

export type PipelineStage =
  | "DISCOVER"
  | "DEDUPE"
  | "ENRICH"
  | "ANALYZE"
  | "SCORE"
  | "OPPORTUNITIES"
  | "PROPOSAL"
  | "LANDING"
  | "MESSAGES"
  | "FINALIZE";

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  "DISCOVER",
  "DEDUPE",
  "ENRICH",
  "ANALYZE",
  "SCORE",
  "OPPORTUNITIES",
  "PROPOSAL",
  "LANDING",
  "MESSAGES",
  "FINALIZE",
] as const;

export type OutreachChannel = "WHATSAPP" | "LINKEDIN" | "EMAIL";

export type OpportunitySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type CrmStatus =
  | "NEW"
  | "CONTACTED"
  | "REPLIED"
  | "MEETING"
  | "PROPOSAL"
  | "WON"
  | "LOST";

/** Empresa normalizada saída de um collector, antes de persistir/dedupe. */
export interface CompanyDraft {
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  googlePlaceId?: string;
  category?: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviewCount?: number;
  photoCount?: number;
  source: SourceName;
  raw: unknown;
}

/** Item explicável do breakdown de score. */
export interface ScoreBreakdownItem {
  raw: number;
  weight: number;
  points: number;
}

export interface IcpScoreResult {
  total: number;
  buyingIntent: number;
  reputation: number;
  breakdown: Record<string, ScoreBreakdownItem>;
  scoringVersion: string;
}
