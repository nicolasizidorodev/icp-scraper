import { prisma, type Prisma } from "@icp/db";
import { childLogger } from "@icp/logger";
import { analyzeWebsite, fetchGbpDetails, type WebsiteAnalysis } from "@icp/analyzers";
import { analyzeScreenshot, type InlineImage } from "@icp/ai";
import { tryAi } from "./aiguard.js";

/** Persiste WebsiteAudit + SeoAudit a partir do resultado da análise (idempotente). */
async function persistWebsite(companyId: string, a: WebsiteAnalysis): Promise<void> {
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
    raw: { failures: a.failures } as Prisma.InputJsonValue,
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
    prisma.websiteAudit.upsert({ where: { companyId }, create: websiteData, update: websiteData }),
    prisma.seoAudit.upsert({ where: { companyId }, create: seoData, update: seoData }),
  ]);
}

/** Converte data URI do screenshot em imagem inline p/ visão. */
function toInlineImage(dataUri?: string): InlineImage | null {
  if (!dataUri) return null;
  const m = dataUri.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
  if (!m) return null;
  return { mediaType: m[1]!, base64: m[2]! };
}

/** Persiste VisualAnalysis: paleta (programática) + análise de visão por IA (degradável). */
async function persistVisual(companyId: string, campaignId: string, a: WebsiteAnalysis): Promise<void> {
  if (!a.exists) return;

  const base: Prisma.VisualAnalysisUncheckedCreateInput = {
    companyId,
    palette: a.palette,
    screenshotUrl: a.screenshot ?? null,
    status: "PARTIAL",
  };

  const image = toInlineImage(a.screenshot);
  if (image) {
    // ~1000 tokens de imagem aproximados no inputText p/ o guard de custo
    const v = await tryAi(
      campaignId,
      { tier: "vision", inputText: "x".repeat(4000), maxTokens: 1024, stage: "analyze:visual" },
      () => analyzeScreenshot(image),
    );
    if (v) {
      Object.assign(base, {
        designQuality: v.designQuality,
        premiumScore: v.premiumScore,
        amateurFlags: v.amateurFlags,
        realPhotos: v.realPhotos,
        legibility: v.legibility,
        ctaQuality: v.ctaQuality,
        uxNotes: v.uxNotes,
        status: "OK" as const,
        raw: v as unknown as Prisma.InputJsonValue,
      });
    }
  }

  await prisma.visualAnalysis.upsert({ where: { companyId }, create: base, update: base });
}

/** Persiste SocialProfile a partir dos links detectados + campos conhecidos. */
async function persistSocial(
  companyId: string,
  a: WebsiteAnalysis,
  known: { instagram: string | null; facebook: string | null; linkedin: string | null },
): Promise<void> {
  // merge: detectados no site + campos conhecidos (só p/ redes ainda ausentes)
  const byNet = new Map(a.social.map((s) => [s.network, s]));
  const addKnown = (network: "instagram" | "facebook" | "linkedin", url: string | null) => {
    if (url && !byNet.has(network)) byNet.set(network, { network, url });
  };
  addKnown("instagram", known.instagram);
  addKnown("facebook", known.facebook);
  addKnown("linkedin", known.linkedin);

  const merged = [...byNet.values()];
  if (merged.length === 0) return;

  await prisma.$transaction(
    merged.map((s) =>
      prisma.socialProfile.upsert({
        where: { companyId_network: { companyId, network: s.network } },
        create: { companyId, network: s.network, url: s.url, handle: s.handle ?? null, status: "PARTIAL" },
        update: { url: s.url, handle: s.handle ?? null, status: "PARTIAL" },
      }),
    ),
  );
}

/** Persiste GbpProfile via Place Details (degradável). */
async function persistGbp(companyId: string, placeId: string | null): Promise<void> {
  if (!placeId) return;
  const log = childLogger({ stage: "analyze:gbp", companyId });
  try {
    const g = await fetchGbpDetails(placeId);
    const data: Prisma.GbpProfileUncheckedCreateInput = {
      companyId,
      rating: g.rating ?? null,
      reviewCount: g.reviewCount ?? null,
      reviewFrequency: g.reviewFrequency ?? null,
      lastReviewAt: g.lastReviewAt ?? null,
      photoCount: g.photoCount ?? null,
      categories: g.categories,
      description: g.description ?? null,
      status: g.status,
      raw: (g.raw ?? null) as Prisma.InputJsonValue,
    };
    await prisma.gbpProfile.upsert({ where: { companyId }, create: data, update: data });
  } catch (err) {
    log.warn({ err }, "GBP details falhou (sem chave ou erro de API)");
  }
}

/** Estágio ANALYZE (F3+F5): site/SEO/tech + visual + GBP + social. Degradável. */
export async function runAnalyze(companyId: string, campaignId: string): Promise<WebsiteAnalysis> {
  const log = childLogger({ stage: "analyze", companyId });
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { website: true, googlePlaceId: true, instagram: true, facebook: true, linkedin: true },
  });

  const result = await analyzeWebsite(company.website);
  await persistWebsite(companyId, result);

  // enriquecimento F5 em paralelo, cada um degradável
  await Promise.all([
    persistVisual(companyId, campaignId, result),
    persistSocial(companyId, result, {
      instagram: company.instagram,
      facebook: company.facebook,
      linkedin: company.linkedin,
    }),
    persistGbp(companyId, company.googlePlaceId),
  ]);

  log.info({ exists: result.exists, status: result.status }, "ANALYZE concluído (site+visual+gbp+social)");
  return result;
}
