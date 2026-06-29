import { z } from "zod";

/** Input de criação de campanha. Valida a fronteira da API. */
export const CampaignInput = z.object({
  niche: z.string().min(2),
  subNiche: z.string().optional(),
  city: z.string().min(2),
  state: z.string().optional(),
  country: z.string().default("BR"),
  maxCompanies: z.number().int().min(1).max(5000).default(100),
});
export type CampaignInput = z.infer<typeof CampaignInput>;

/** Copy estruturada de landing page gerada por IA (ver ADR-0005). */
export const LandingCopy = z.object({
  hero: z.object({
    headline: z.string(),
    subheadline: z.string(),
    ctaLabel: z.string(),
  }),
  benefits: z.array(z.object({ title: z.string(), description: z.string() })).min(3),
  procedures: z.array(z.object({ name: z.string(), description: z.string() })),
  team: z.array(z.object({ name: z.string(), role: z.string(), placeholder: z.boolean() })),
  // Depoimentos SEMPRE marcados como exemplo (guardrail ADR-0006).
  testimonials: z
    .array(
      z.object({
        author: z.string(),
        text: z.string(),
        isExample: z.literal(true),
      }),
    )
    .default([]),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })),
  contact: z.object({
    whatsapp: z.string().optional(),
    address: z.string().optional(),
  }),
});
export type LandingCopy = z.infer<typeof LandingCopy>;

/** Conteúdo estruturado da proposta comercial gerada por IA. */
export const ProposalContent = z.object({
  executiveSummary: z.string().min(40),
  problems: z.string().min(40),
  estimatedImpact: z.string().min(20),
  suggestions: z.string().min(40),
  roiEstimate: z.string().min(10),
  priorities: z.string().min(20),
});
export type ProposalContent = z.infer<typeof ProposalContent>;

/** Saída estruturada da análise visual por LLM. */
export const VisualAnalysisResult = z.object({
  designQuality: z.number().int().min(0).max(100),
  premiumScore: z.number().int().min(0).max(100),
  amateurFlags: z.array(z.string()),
  realPhotos: z.boolean(),
  legibility: z.number().int().min(0).max(100),
  ctaQuality: z.number().int().min(0).max(100),
  uxNotes: z.string(),
});
export type VisualAnalysisResult = z.infer<typeof VisualAnalysisResult>;
