import { z } from "zod";

// Carrega e valida env uma vez. Falha cedo se faltar config crítica.
// Segredos só são lidos aqui (server/worker), nunca expostos ao client.

const boolish = z
  .string()
  .transform((v) => v === "true" || v === "1")
  .pipe(z.boolean());

const EnvSchema = z.object({
  // infra
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  // criptografia das chaves de API guardadas no banco (32 bytes hex/base64)
  APP_ENCRYPTION_KEY: z.string().optional(),

  // ai
  LLM_PROVIDER: z.enum(["claude", "openai"]).default("claude"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  MODEL_BULK: z.string().default("claude-sonnet-4-6"),
  MODEL_LONGFORM: z.string().default("claude-opus-4-8"),
  MODEL_VISION: z.string().default("claude-opus-4-8"),

  // fontes
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  PAGESPEED_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  COLLECTOR_PLACES_ENABLED: boolish.default("true"),
  COLLECTOR_CNPJ_ENABLED: boolish.default("true"),
  COLLECTOR_APIFY_ENABLED: boolish.default("false"),
  APIFY_TOKEN: z.string().optional(),
  SOCIAL_ANALYSIS_ENABLED: boolish.default("false"),

  // lp
  LP_BASE_URL: z.string().default("http://localhost:3000/lp"),

  // limites
  LLM_BUDGET_USD_PER_CAMPAIGN: z.coerce.number().default(10),
  MAX_CONCURRENCY_ANALYZE: z.coerce.number().int().default(20),
  MAX_CONCURRENCY_AI: z.coerce.number().int().default(3),
  MAX_CONCURRENCY_DEFAULT: z.coerce.number().int().default(5),

  // auth (scaffold multi-tenant): se setado, exige Bearer nas rotas de escrita
  ADMIN_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Env inválida:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
