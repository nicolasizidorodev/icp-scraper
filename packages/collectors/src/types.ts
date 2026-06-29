import type { CampaignInput, CompanyDraft } from "@icp/core";
import type { Logger } from "@icp/logger";
import type { RateLimiter } from "@icp/queue";

export interface CollectorContext {
  campaign: CampaignInput;
  signal: AbortSignal;
  rateLimit: RateLimiter;
  logger: Logger;
}

export interface ICollector {
  readonly name: CompanyDraft["source"];
  /** Habilitado = flag de config ligada + chave resolvível (DB via UI, ou env). Async por causa do DB. */
  isEnabled(): Promise<boolean>;
  /** Stream paginado de empresas. Para ao atingir maxCompanies (responsabilidade do consumidor). */
  discover(ctx: CollectorContext): AsyncIterable<CompanyDraft>;
}
