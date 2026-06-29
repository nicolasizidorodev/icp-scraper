import { prisma, type Prisma } from "@icp/db";
import { childLogger } from "@icp/logger";
import { analyzeWebsite, type WebsiteAnalysis } from "@icp/analyzers";

/** Persiste WebsiteAudit + SeoAudit a partir do resultado da análise (idempotente por companyId). */
async function persist(companyId: string, a: WebsiteAnalysis): Promise<void> {
  const { onpage, psi, tech, robots } = a;

  const websiteData: Prisma.WebsiteAuditUncheckedCreateInput = {
    companyId,
    exists: a.exists,
    finalUrl: a.finalUrl ?? null,
    loadTimeMs: a.loadTimeMs ?? null,
    perfScore: psi.perfScore ?? null,
    seoScore: psi.seoScore ?? null,
    a11yScore: psi.a11yScore ?? null,
    bestPractices: psi.bestPractices ?? null,
    lcpMs: psi.lcpMs ?? null,
    cls: psi.cls ?? null,
    inpMs: psi.inpMs ?? null,
    ssl: a.ssl ?? null,
    cms: tech.cms ?? null,
    framework: tech.framework ?? null,
    responsive: onpage?.responsive ?? null,
    hasWhatsappBtn: tech.hasWhatsappBtn,
    hasBooking: tech.hasBooking,
    hasMetaPixel: tech.hasMetaPixel,
    hasGA: tech.hasGA,
    hasGTM: tech.hasGTM,
    hasClarity: tech.hasClarity,
    hasChat: tech.hasChat,
    hasForms: onpage?.hasForms ?? false,
    hasBlog: onpage?.hasBlog ?? false,
    hasSchema: onpage?.hasSchema ?? false,
    hasOG: onpage?.hasOG ?? false,
    hasFavicon: onpage?.hasFavicon ?? false,
    hasRobots: robots.hasRobots,
    hasSitemap: robots.hasSitemap,
    metaTags: (onpage?.metaTags ?? {}) as Prisma.InputJsonValue,
    techStack: tech.techStack as unknown as Prisma.InputJsonValue,
    status: a.status,
    raw: { failures: a.failures, psi: psi.raw ?? null } as Prisma.InputJsonValue,
  };

  const seoData: Prisma.SeoAuditUncheckedCreateInput = {
    companyId,
    title: onpage?.title ?? null,
    description: onpage?.description ?? null,
    canonical: onpage?.canonical ?? null,
    headingIssues: (onpage?.headingIssues ?? {}) as Prisma.InputJsonValue,
    keywords: onpage?.keywords ?? [],
    internalLinks: onpage?.internalLinks ?? null,
    cwvPass: psi.cwvPass ?? null,
    status: a.status,
  };

  await prisma.$transaction([
    prisma.websiteAudit.upsert({
      where: { companyId },
      create: websiteData,
      update: websiteData,
    }),
    prisma.seoAudit.upsert({
      where: { companyId },
      create: seoData,
      update: seoData,
    }),
  ]);
}

/** Estágio ANALYZE (F3): análise de site da empresa. Visual/GBP/social ficam p/ F5. */
export async function runWebsiteAnalysis(companyId: string): Promise<WebsiteAnalysis> {
  const log = childLogger({ stage: "analyze", companyId });
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { website: true },
  });

  const result = await analyzeWebsite(company.website);
  await persist(companyId, result);
  log.info(
    { exists: result.exists, status: result.status, perf: result.psi.perfScore },
    "análise de site concluída",
  );
  return result;
}
