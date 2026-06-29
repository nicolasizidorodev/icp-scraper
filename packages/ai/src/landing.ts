import { LandingCopy } from "@icp/core";
import { completeJson } from "./json.js";

const SYSTEM = `Você é um copywriter especialista em páginas de alta conversão para
pequenos negócios locais. Gere a copy de uma landing page personalizada que demonstre,
ANTES do primeiro contato, como o negócio do cliente ficaria com uma presença digital
profissional. Regras rígidas (legais e de qualidade):
- Use SOMENTE fatos reais do diagnóstico (nome, categoria, cidade, serviços conhecidos).
- Depoimentos: SEMPRE com isExample=true e texto claramente fictício de demonstração de
  layout. NUNCA invente avaliações atribuídas a clientes reais.
- Membros de equipe: marque placeholder=true quando não houver nome real conhecido.
- Proibido "Lorem Ipsum" ou texto de preenchimento. Tudo deve ser plausível ao negócio.
- Português do Brasil. CTA voltado a WhatsApp/contato.`;

/** Gera copy estruturada de landing page personalizada por empresa. */
export async function generateLandingCopy(
  brief: string,
  opts?: { provider?: "claude" | "openai" },
): Promise<LandingCopy> {
  return completeJson(LandingCopy, {
    system: SYSTEM,
    tier: "longform",
    temperature: 0.6,
    maxTokens: 3500,
    provider: opts?.provider,
    prompt: `Diagnóstico do negócio:\n${brief}\n\nGere a copy completa da landing page como JSON no schema: hero{headline,subheadline,ctaLabel}, benefits[{title,description}] (min 3), procedures[{name,description}], team[{name,role,placeholder}], testimonials[{author,text,isExample:true}], faq[{question,answer}], contact{whatsapp?,address?}.`,
  });
}
