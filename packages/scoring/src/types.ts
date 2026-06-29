import type { OpportunitySeverity } from "@icp/core";

/** Sinais de site relevantes p/ o score (subconjunto de WebsiteAudit). */
export interface WebsiteSignals {
  exists: boolean;
  perfScore?: number | null;
  seoScore?: number | null;
  responsive?: boolean | null;
  ssl?: boolean | null;
  hasMetaPixel: boolean;
  hasGA: boolean;
  hasGTM: boolean;
  hasBooking: boolean;
  hasChat: boolean;
  hasWhatsappBtn: boolean;
  hasForms: boolean;
}

/** Entrada normalizada do motor de score (montada a partir do DB). */
export interface ScoringInput {
  rating?: number | null;
  reviewCount?: number | null;
  yearsActive?: number | null;
  website: WebsiteSignals | null; // null = empresa sem site detectado
  runsAds?: boolean | null; // investe em mídia paga (prova de caixa + intenção)
}

/** Oportunidade derivada por regra (fallback determinístico sem IA). */
export interface DerivedOpportunity {
  title: string;
  detail: string;
  severity: OpportunitySeverity;
  evidence: Record<string, unknown>;
}
