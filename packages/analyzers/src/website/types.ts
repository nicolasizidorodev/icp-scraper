import type { AuditStatus } from "@icp/core";

/** Resultado bruto do fetch de uma página. */
export interface FetchResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  html: string;
  ssl: boolean;
  loadTimeMs: number;
  headers: Record<string, string>;
}

/** Métricas Lighthouse/PSI (0-100) + Core Web Vitals. */
export interface PsiResult {
  perfScore?: number;
  seoScore?: number;
  a11yScore?: number;
  bestPractices?: number;
  lcpMs?: number;
  cls?: number;
  inpMs?: number;
  cwvPass?: boolean;
  /** Screenshot final do Lighthouse (data URI). Reusado pela análise visual. */
  screenshot?: string;
  raw?: unknown;
}

/** Tech-detect: CMS/framework + pixels + widgets. */
export interface TechResult {
  cms?: string;
  framework?: string;
  techStack: string[];
  hasMetaPixel: boolean;
  hasGA: boolean;
  hasGTM: boolean;
  hasClarity: boolean;
  hasChat: boolean;
  hasWhatsappBtn: boolean;
  hasBooking: boolean;
}

/** Onpage / SEO técnico extraído do HTML. */
export interface OnpageResult {
  title?: string;
  description?: string;
  canonical?: string;
  responsive: boolean;
  hasSchema: boolean;
  hasOG: boolean;
  hasFavicon: boolean;
  hasForms: boolean;
  hasBlog: boolean;
  internalLinks: number;
  keywords: string[];
  headingIssues: HeadingIssues;
  metaTags: Record<string, string>;
}

export interface HeadingIssues {
  h1: number;
  h2: number;
  h3: number;
  multipleH1: boolean;
  missingH1: boolean;
}

/** Existência de robots.txt / sitemap.xml. */
export interface RobotsResult {
  hasRobots: boolean;
  hasSitemap: boolean;
}

/** Saída unificada da análise de site — mapeia p/ WebsiteAudit + SeoAudit. */
export interface WebsiteAnalysis {
  exists: boolean;
  finalUrl?: string;
  ssl?: boolean;
  loadTimeMs?: number;
  psi: PsiResult;
  tech: TechResult;
  onpage?: OnpageResult;
  robots: RobotsResult;
  /** Paleta de cores dominante extraída do HTML (p/ tematizar a LP). */
  palette: string[];
  /** Perfis sociais detectados em links do site (sem scraping). */
  social: { network: "instagram" | "facebook" | "linkedin"; url: string; handle?: string }[];
  /** Sinais de mídia paga detectados no HTML (heurística). */
  ads: { runsAdsLikely: boolean; networks: string[]; signals: string[] };
  /** Screenshot final (data URI) p/ análise visual, se o PSI retornou. */
  screenshot?: string;
  status: AuditStatus;
  failures: string[];
}
