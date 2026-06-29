/** Camada/tier de modelo → mapeia p/ MODEL_BULK | MODEL_LONGFORM | MODEL_VISION. */
export type ModelTier = "bulk" | "longform" | "vision";

/** Imagem inline p/ análise de visão (base64 + media type). */
export interface InlineImage {
  base64: string;
  mediaType: string; // ex: "image/jpeg"
}

export interface CompletionRequest {
  system?: string;
  prompt: string;
  /** Override de modelo; se ausente, resolve pelo tier. */
  model?: string;
  tier?: ModelTier;
  maxTokens?: number;
  temperature?: number;
  /** Pede saída JSON pura (response_format / instrução). */
  json?: boolean;
  /** Imagem p/ multimodal (vision). */
  image?: InlineImage;
}

/** Provider de LLM intercambiável (claude | openai). */
export interface ILLMProvider {
  readonly name: "claude" | "openai";
  /** Resolve a chave (DB/UI > env). false = sem credencial → degradar. */
  isReady(): Promise<boolean>;
  complete(req: CompletionRequest): Promise<string>;
}

export class LLMUnavailableError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "LLMUnavailableError";
  }
}
