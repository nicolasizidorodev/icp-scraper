import { prisma } from "@icp/db";
import { childLogger } from "@icp/logger";
import { getProvider, generateOutreach, type AiOutreachMessage } from "@icp/ai";
import { buildCompanyBrief } from "./brief.js";
import { tryAi } from "./aiguard.js";

type Channel = "WHATSAPP" | "EMAIL";

/** Mensagens determinísticas (fallback sem IA) a partir do achado principal. */
async function fallbackMessages(
  companyId: string,
  name: string,
): Promise<AiOutreachMessage[]> {
  const top = await prisma.opportunity.findFirst({
    where: { companyId },
    orderBy: { severity: "desc" },
  });
  const hook = top
    ? `notamos um ponto que pode estar custando clientes: ${top.title.toLowerCase()}`
    : "vimos espaço para fortalecer a presença digital de vocês";

  return [
    {
      channel: "WHATSAPP",
      body: `Olá! Aqui é da equipe de marketing. Analisando a presença online da ${name}, ${hook}. Preparamos uma prévia de página como demonstração — posso te enviar para dar uma olhada?`,
    },
    {
      channel: "EMAIL",
      subject: `Uma prévia para a ${name}`,
      body: `Olá,\n\nAo analisar a presença digital da ${name}, ${hook}. Para mostrar o potencial na prática, montamos uma landing page de demonstração personalizada para vocês.\n\nPosso te enviar o link e marcar uma conversa rápida de 15 minutos?\n\nAbraço.`,
    },
  ];
}

/** Estágio MESSAGES (F7): outreach WhatsApp + Email (IA → fallback). Idempotente. */
export async function runOutreach(companyId: string, campaignId: string): Promise<number> {
  const log = childLogger({ stage: "messages", companyId });
  const { brief, company } = await buildCompanyBrief(companyId);

  const ai = await tryAi(
    campaignId,
    { tier: "bulk", inputText: brief, maxTokens: 1200, stage: "messages" },
    () => generateOutreach(brief),
  );

  const msgs: AiOutreachMessage[] = ai ?? (await fallbackMessages(companyId, company.name));
  const generatedBy = ai ? getProvider().name : "rule:fallback";

  // dedupe por canal (schema tem @@unique([companyId, channel]))
  const byChannel = new Map<Channel, AiOutreachMessage>();
  for (const m of msgs) byChannel.set(m.channel, m);

  await prisma.$transaction(
    [...byChannel.values()].map((m) =>
      prisma.outreachMessage.upsert({
        where: { companyId_channel: { companyId, channel: m.channel } },
        create: { companyId, channel: m.channel, subject: m.subject ?? null, body: m.body, generatedBy },
        update: { subject: m.subject ?? null, body: m.body, generatedBy },
      }),
    ),
  );

  log.info({ count: byChannel.size, via: generatedBy }, "MESSAGES gravadas");
  return byChannel.size;
}
