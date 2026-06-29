import { getApiKey } from "@icp/secrets";
import { resolveModel } from "./models.js";
import { LLMUnavailableError, type CompletionRequest, type ILLMProvider } from "./types.js";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const VERSION = "2023-06-01";

interface MessagesResponse {
  content?: { type: string; text?: string }[];
}

export const anthropicProvider: ILLMProvider = {
  name: "claude",

  async isReady() {
    return !!(await getApiKey("ANTHROPIC_API_KEY"));
  },

  async complete(req: CompletionRequest): Promise<string> {
    const key = await getApiKey("ANTHROPIC_API_KEY");
    if (!key) throw new LLMUnavailableError("ANTHROPIC_API_KEY ausente (configure na UI ou .env)");

    const system = req.json
      ? `${req.system ?? ""}\n\nResponda APENAS com JSON válido, sem markdown ou texto extra.`.trim()
      : req.system;

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": VERSION,
      },
      body: JSON.stringify({
        model: resolveModel(req.tier, req.model),
        max_tokens: req.maxTokens ?? 2048,
        temperature: req.temperature ?? 0.4,
        ...(system ? { system } : {}),
        messages: [{ role: "user", content: req.prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as MessagesResponse;
    return (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
  },
};
