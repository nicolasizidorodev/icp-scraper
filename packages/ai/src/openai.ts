import { getApiKey } from "@icp/secrets";
import { resolveModel } from "./models.js";
import { LLMUnavailableError, type CompletionRequest, type ILLMProvider } from "./types.js";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

export const openaiProvider: ILLMProvider = {
  name: "openai",

  async isReady() {
    return !!(await getApiKey("OPENAI_API_KEY"));
  },

  async complete(req: CompletionRequest): Promise<string> {
    const key = await getApiKey("OPENAI_API_KEY");
    if (!key) throw new LLMUnavailableError("OPENAI_API_KEY ausente (configure na UI ou .env)");

    const messages = [
      ...(req.system ? [{ role: "system" as const, content: req.system }] : []),
      { role: "user" as const, content: req.prompt },
    ];

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: resolveModel(req.tier, req.model),
        max_tokens: req.maxTokens ?? 2048,
        temperature: req.temperature ?? 0.4,
        messages,
        ...(req.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as ChatResponse;
    return (data.choices?.[0]?.message?.content ?? "").trim();
  },
};
