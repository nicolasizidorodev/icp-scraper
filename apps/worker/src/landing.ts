import { prisma, type Prisma } from "@icp/db";
import { childLogger } from "@icp/logger";
import { getEnv } from "@icp/config";
import { getProvider, generateLandingCopy } from "@icp/ai";
import { renderLandingHtml, landingSlug } from "@icp/lp-generator";
import type { LandingCopy } from "@icp/core";
import { buildCompanyBrief } from "./brief.js";

/** Copy determinística a partir dos fatos da empresa (fallback sem IA). */
async function fallbackCopy(
  companyId: string,
  company: { name: string; category: string | null; city: string | null; whatsapp: string | null; phone: string | null; address: string | null },
): Promise<LandingCopy> {
  const ops = await prisma.opportunity.findMany({ where: { companyId }, take: 3 });
  const cat = company.category ?? "seu negócio";
  const where = company.city ? ` em ${company.city}` : "";

  const benefits = (
    ops.length
      ? ops.map((o) => ({ title: o.title.replace(/^Sem |^Site /i, ""), description: o.detail }))
      : [
          { title: "Atendimento próximo", description: `Equipe pronta para atender você${where}.` },
          { title: "Qualidade comprovada", description: "Compromisso com excelência em cada detalhe." },
          { title: "Fácil contato", description: "Fale pelo WhatsApp e agende em minutos." },
        ]
  ).slice(0, 3);
  while (benefits.length < 3) {
    benefits.push({ title: "Confiança", description: "Atendimento transparente do início ao fim." });
  }

  return {
    hero: {
      headline: `${company.name}`,
      subheadline: `${cat.charAt(0).toUpperCase() + cat.slice(1)}${where} com atendimento profissional.`,
      ctaLabel: "Fale no WhatsApp",
    },
    benefits,
    procedures: [],
    team: [],
    testimonials: [
      {
        author: "Cliente Exemplo",
        text: "Modelo de depoimento para demonstrar o layout da página.",
        isExample: true,
      },
    ],
    faq: [
      { question: "Como faço para agendar?", answer: "Clique no botão de WhatsApp e fale com a nossa equipe." },
      { question: "Qual o horário de atendimento?", answer: "Entre em contato para confirmar a disponibilidade." },
    ],
    contact: {
      whatsapp: company.whatsapp ?? company.phone ?? undefined,
      address: company.address ?? undefined,
    },
  };
}

/** Estágio LANDING (F6): copy personalizada (IA → fallback) + render HTML + persist. */
export async function runLanding(companyId: string): Promise<string> {
  const log = childLogger({ stage: "landing", companyId });
  const { brief, company } = await buildCompanyBrief(companyId);
  const provider = getProvider();

  let copy: LandingCopy;
  let generatedBy = "rule:fallback";

  if (await provider.isReady()) {
    try {
      copy = await generateLandingCopy(brief);
      generatedBy = provider.name;
    } catch (err) {
      log.warn({ err }, "LLM landing falhou — fallback");
      copy = await fallbackCopy(companyId, company);
    }
  } else {
    copy = await fallbackCopy(companyId, company);
  }

  // paleta da análise visual (F5) se houver; senão tema neutro no renderer
  const visual = await prisma.visualAnalysis.findUnique({
    where: { companyId },
    select: { palette: true },
  });

  const html = renderLandingHtml({ company, copy, palette: visual?.palette });
  const slug = landingSlug(company.name, companyId);
  const url = `${getEnv().LP_BASE_URL}/${slug}`;

  await prisma.landingPage.upsert({
    where: { companyId },
    create: {
      companyId,
      slug,
      url,
      status: "GENERATED",
      palette: visual?.palette ?? [],
      copy: copy as unknown as Prisma.InputJsonValue,
      html,
      generatedBy,
    },
    update: {
      url,
      status: "GENERATED",
      palette: visual?.palette ?? [],
      copy: copy as unknown as Prisma.InputJsonValue,
      html,
      generatedBy,
    },
  });
  log.info({ slug, via: generatedBy }, "LANDING gerada");
  return slug;
}
