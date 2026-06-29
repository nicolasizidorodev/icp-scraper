import { prisma } from "@icp/db";

/** Carrega empresa + diagnóstico e monta um brief textual (só fatos) p/ IA. */
export async function buildCompanyBrief(companyId: string): Promise<{
  brief: string;
  company: { name: string; category: string | null; city: string | null; phone: string | null; whatsapp: string | null; address: string | null };
}> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: {
      name: true,
      category: true,
      city: true,
      state: true,
      phone: true,
      whatsapp: true,
      address: true,
      rating: true,
      reviewCount: true,
    },
  });
  const [audit, seo, score, ad, opportunities] = await Promise.all([
    prisma.websiteAudit.findUnique({ where: { companyId } }),
    prisma.seoAudit.findUnique({ where: { companyId } }),
    prisma.icpScore.findUnique({ where: { companyId } }),
    prisma.adProfile.findUnique({ where: { companyId } }),
    prisma.opportunity.findMany({ where: { companyId }, orderBy: { severity: "desc" } }),
  ]);

  const lines: string[] = [
    `Empresa: ${company.name}`,
    company.category && `Categoria: ${company.category}`,
    (company.city || company.state) && `Local: ${[company.city, company.state].filter(Boolean).join("/")}`,
    company.rating != null && `Avaliação Google: ${company.rating} (${company.reviewCount ?? 0} reviews)`,
  ].filter(Boolean) as string[];

  if (!audit || !audit.exists) {
    lines.push("Site: NÃO possui site próprio detectado.");
  } else {
    lines.push(
      `Site: ${audit.finalUrl ?? "(url)"} | Performance ${audit.perfScore ?? "?"}/100 | SEO ${audit.seoScore ?? "?"}/100 | Responsivo ${audit.responsive} | HTTPS ${audit.ssl}`,
      `Conversão: whatsapp=${audit.hasWhatsappBtn} agendamento=${audit.hasBooking} formulário=${audit.hasForms} | Marketing: pixel=${audit.hasMetaPixel} GA=${audit.hasGA}`,
    );
    if (seo?.title) lines.push(`SEO title: "${seo.title}"`);
  }

  if (ad?.runsAds) {
    lines.push(
      `Mídia paga: investe em anúncios (${ad.networks.join(", ") || "rede não identificada"}${ad.activeAds != null ? `, ${ad.activeAds} ativos` : ""}).`,
    );
  }

  if (score) lines.push(`ICP score: ${score.total}/100 (intenção de compra ${score.buyingIntent})`);

  if (opportunities.length) {
    lines.push("Oportunidades identificadas:");
    for (const o of opportunities) lines.push(`- [${o.severity}] ${o.title}: ${o.detail}`);
  }

  return { brief: lines.join("\n"), company };
}
