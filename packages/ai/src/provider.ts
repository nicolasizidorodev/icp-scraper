import { getEnv } from "@icp/config";
import { anthropicProvider } from "./anthropic.js";
import { openaiProvider } from "./openai.js";
import type { ILLMProvider } from "./types.js";

/** Provider ativo conforme LLM_PROVIDER (default claude). Pluggable (ADR-0002). */
export function getProvider(name?: "claude" | "openai"): ILLMProvider {
  const sel = name ?? getEnv().LLM_PROVIDER;
  return sel === "openai" ? openaiProvider : anthropicProvider;
}
