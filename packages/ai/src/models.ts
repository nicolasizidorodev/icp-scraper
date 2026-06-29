import { getEnv } from "@icp/config";
import type { ModelTier } from "./types.js";

/** Resolve o nome do modelo p/ um tier, com override explícito. */
export function resolveModel(tier: ModelTier = "bulk", override?: string): string {
  if (override) return override;
  const env = getEnv();
  switch (tier) {
    case "longform":
      return env.MODEL_LONGFORM;
    case "vision":
      return env.MODEL_VISION;
    default:
      return env.MODEL_BULK;
  }
}
