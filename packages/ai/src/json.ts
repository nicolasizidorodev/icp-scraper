import type { z } from "zod";
import { getProvider } from "./provider.js";
import type { CompletionRequest } from "./types.js";

/** Extrai o primeiro bloco JSON de um texto (tolera cercas markdown). */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? text;
  const start = body.search(/[[{]/);
  if (start === -1) return body.trim();
  const open = body[start];
  const close = open === "[" ? "]" : "}";
  const end = body.lastIndexOf(close);
  return end > start ? body.slice(start, end + 1) : body.slice(start);
}

export interface JsonRequest extends Omit<CompletionRequest, "json"> {
  provider?: "claude" | "openai";
}

/**
 * Completa + valida saída estruturada contra um schema zod.
 * 1 retry com feedback do erro de validação. Lança se ainda inválido.
 */
export async function completeJson<T>(schema: z.ZodType<T>, req: JsonRequest): Promise<T> {
  const provider = getProvider(req.provider);
  let lastErr = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0
        ? req.prompt
        : `${req.prompt}\n\nSua resposta anterior falhou na validação: ${lastErr}\nRetorne JSON estritamente conforme o schema.`;

    const text = await provider.complete({ ...req, prompt, json: true });
    try {
      return schema.parse(JSON.parse(extractJson(text)));
    } catch (err) {
      lastErr = err instanceof Error ? err.message.slice(0, 200) : String(err);
    }
  }
  throw new Error(`LLM JSON inválido após retry: ${lastErr}`);
}
