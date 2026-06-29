import { z } from "zod";
import { completeJson } from "./json.js";

export const AiOutreachMessage = z.object({
  channel: z.enum(["WHATSAPP", "EMAIL"]),
  subject: z.string().optional(),
  body: z.string().min(20),
});
export type AiOutreachMessage = z.infer<typeof AiOutreachMessage>;

export const AiOutreachList = z.object({
  messages: z.array(AiOutreachMessage).min(1).max(3),
});

const SYSTEM = `Você escreve mensagens de primeiro contato (cold outreach) B2B para uma
agência de marketing abordando um possível cliente. Regras:
- Personalize com o achado mais forte do diagnóstico (sem soar invasivo nem alarmista).
- WhatsApp: curto (até 60 palavras), tom humano, 1 pergunta de abertura, sem links longos.
- Email: assunto curto + corpo de até 120 palavras, com CTA claro (responder/agendar).
- Mencione que já preparamos uma prévia/landing como demonstração de valor.
- NUNCA prometa resultados garantidos. Português do Brasil. Sem emojis em excesso.`;

/** Gera mensagens de outreach (WhatsApp + Email) personalizadas pelo diagnóstico. */
export async function generateOutreach(
  brief: string,
  opts?: { provider?: "claude" | "openai" },
): Promise<AiOutreachMessage[]> {
  const { messages } = await completeJson(AiOutreachList, {
    system: SYSTEM,
    tier: "bulk",
    temperature: 0.6,
    maxTokens: 1200,
    provider: opts?.provider,
    prompt: `Diagnóstico do prospect:\n${brief}\n\nGere mensagens JSON: {"messages":[{"channel":"WHATSAPP|EMAIL","subject"?,"body"}]}. Inclua uma de WhatsApp e uma de Email.`,
  });
  return messages;
}
