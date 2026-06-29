import { VisualAnalysisResult } from "@icp/core";
import { completeJson } from "./json.js";
import type { InlineImage } from "./types.js";

const SYSTEM = `Você é um avaliador sênior de design e UX de sites. Recebe um screenshot da
home de um site e avalia objetivamente a qualidade visual. Seja crítico e específico.
Critérios (0-100): designQuality (geral), premiumScore (aparência profissional/premium),
legibility (legibilidade), ctaQuality (clareza das chamadas para ação). amateurFlags =
lista curta de problemas concretos (ex: "cores destoantes", "fotos de banco genéricas",
"excesso de texto"). realPhotos = usa fotos reais do negócio (true) ou stock/genéricas
(false). uxNotes = 1-2 frases de recomendação. Português do Brasil.`;

/** Analisa o screenshot de um site via LLM de visão → métricas estruturadas. */
export async function analyzeScreenshot(
  image: InlineImage,
  opts?: { provider?: "claude" | "openai" },
): Promise<VisualAnalysisResult> {
  return completeJson(VisualAnalysisResult, {
    system: SYSTEM,
    tier: "vision",
    temperature: 0.3,
    maxTokens: 1024,
    image,
    provider: opts?.provider,
    prompt:
      'Avalie este screenshot. Retorne JSON: {"designQuality","premiumScore","amateurFlags","realPhotos","legibility","ctaQuality","uxNotes"}.',
  });
}
