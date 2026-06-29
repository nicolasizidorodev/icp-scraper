# Contratos de módulo

Interfaces TypeScript que cada `packages/*` expõe. Definem as fronteiras antes da implementação — toda fase em `PLAN.md` implementa contra estes contratos. Tipos de domínio vivem em `packages/core`; aqui só as **portas**.

## `core` — tipos & validação

```ts
// packages/core/src/types.ts  (espelham o Prisma, mas desacoplados do client)
export interface CompanyDraft {
  name: string;
  phone?: string; whatsapp?: string; email?: string;
  website?: string; instagram?: string; facebook?: string; linkedin?: string;
  googlePlaceId?: string; category?: string; cnpj?: string;
  address?: string; city?: string; state?: string; country?: string;
  lat?: number; lng?: number;
  rating?: number; reviewCount?: number; photoCount?: number;
  source: SourceName;
  raw: unknown; // payload bruto da fonte
}

export type SourceName = "places" | "website" | "cnpj" | "social" | "apify";
export type AuditStatus = "PENDING" | "OK" | "PARTIAL" | "FAILED";

// Zod schemas validam TODA fronteira (input de campanha, payload de provider, output de LLM).
export const CampaignInput = z.object({
  niche: z.string().min(2),
  subNiche: z.string().optional(),
  city: z.string().min(2),
  state: z.string().optional(),
  country: z.string().default("BR"),
  maxCompanies: z.number().int().min(1).max(5000).default(100),
});
```

## `collectors` — `ICollector`

```ts
export interface CollectorContext {
  campaign: CampaignInput;
  signal: AbortSignal;
  rateLimit: RateLimiter; // token bucket no Redis, por fonte
  logger: Logger;
}

export interface ICollector {
  readonly name: SourceName;
  readonly enabled: boolean;            // lido de config/env
  discover(ctx: CollectorContext): AsyncIterable<CompanyDraft>;  // paginado/stream
}

// registry: liga/desliga por env, itera só os habilitados
export function getEnabledCollectors(): ICollector[];
```

## `analyzers` — `IAnalyzer`

```ts
export interface AnalyzerInput {
  company: Pick<Company, "id" | "website" | "googlePlaceId" | "instagram" | "...">;
  page?: PageHandle;   // Playwright page reaproveitada quando aplicável
  cache: Cache;        // Redis, TTL por domínio
  logger: Logger;
}

export interface AnalyzerResult<T> {
  status: AuditStatus;
  data: Partial<T>;
  raw?: unknown;
  errors?: string[];
}

export interface IAnalyzer<T> {
  readonly key: string; // "website" | "seo" | "visual" | "tech" | "onpage" | "gbp" | "social"
  run(input: AnalyzerInput): Promise<AnalyzerResult<T>>;
}
```

Cada analyzer é independente e **degradável**: erro → `status: "FAILED"`, sem lançar para o orquestrador.

## `scoring` — função pura

```ts
export interface ScoringInput {
  company: Company;
  website?: WebsiteAudit; seo?: SeoAudit; visual?: VisualAnalysis;
  gbp?: GbpProfile; social?: SocialProfile[];
}
export interface ScoreBreakdownItem { raw: number; weight: number; points: number; }

export interface IcpScoreResult {
  total: number;            // 0-100
  buyingIntent: number;
  reputation: number;
  breakdown: Record<string, ScoreBreakdownItem>;
  scoringVersion: string;
}

export function score(input: ScoringInput): IcpScoreResult; // pura, testável, versionada
```

## `ai` — `ILLMProvider` + tasks

```ts
export interface LLMMessage { role: "system" | "user" | "assistant"; content: LLMContent[]; }
export type LLMContent = { type: "text"; text: string } | { type: "image"; url: string };

export interface LLMCallOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  responseSchema?: ZodSchema;   // força saída estruturada + valida + repara
}

export interface ILLMProvider {
  readonly name: "claude" | "openai";
  complete(messages: LLMMessage[], opts?: LLMCallOptions): Promise<string>;
  completeStructured<T>(messages: LLMMessage[], schema: ZodSchema<T>, opts?: LLMCallOptions): Promise<T>;
}

// seleção por env (LLM_PROVIDER) + override por task (TASK_MODEL_REPORT, ...)
export function getProvider(task?: AiTask): ILLMProvider;

// tasks de alto nível — montam prompt versionado, validam com zod, fazem retry/repair
export function generateReport(c: CompanyBundle): Promise<ReportResult>;
export function generateOpportunities(c: CompanyBundle): Promise<Opportunity[]>;
export function generateProposal(c: CompanyBundle): Promise<ProposalResult>;
export function generateLandingCopy(c: CompanyBundle): Promise<LandingCopy>;
export function generateOutreach(c: CompanyBundle): Promise<OutreachMessage[]>;
export function analyzeVisual(screenshotUrl: string): Promise<VisualAnalysisResult>;
```

## `lp-generator`

```ts
export interface LandingInput {
  company: Company;
  copy: LandingCopy;       // do ai.generateLandingCopy
  palette: string[];       // do VisualAnalysis
  audits: CompanyBundle;
}
export interface LandingOutput { slug: string; html: string; url?: string; }

export function buildLandingPage(input: LandingInput): Promise<LandingOutput>;
export function deployLandingPage(out: LandingOutput): Promise<{ url: string }>;
```

> **Guardrails (ADR-0006):** copy nunca usa Lorem Ipsum nem texto genérico; depoimentos saem sempre rotulados como exemplo de layout; nenhum ativo protegido é copiado — só paleta/estilo derivados.

## `queue`

```ts
export const QUEUES = {
  discover: "discover", dedupe: "dedupe", enrich: "enrich",
  analyze: "analyze", score: "score", opportunities: "opportunities",
  proposal: "proposal", landing: "landing", messages: "messages", finalize: "finalize",
} as const;

export function enqueue<T>(queue: keyof typeof QUEUES, data: T, opts?: JobsOptions): Promise<void>;
export function registerWorker<T>(queue: keyof typeof QUEUES, handler: (job: Job<T>) => Promise<void>): void;
```
