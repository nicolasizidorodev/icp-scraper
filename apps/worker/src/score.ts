import { prisma, type Prisma } from "@icp/db";
import { childLogger } from "@icp/logger";
import { computeIcpScore, type ScoringInput, type WebsiteSignals } from "@icp/scoring";

type AuditRow = NonNullable<Awaited<ReturnType<typeof loadAudit>>>;
async function loadAudit(companyId: string) {
  return prisma.websiteAudit.findUnique({ where: { companyId } });
}

function toSignals(a: AuditRow | null): WebsiteSignals | null {
  if (!a || !a.exists) return null;
  return {
    exists: true,
    perfScore: a.perfScore,
    seoScore: a.seoScore,
    responsive: a.responsive,
    ssl: a.ssl,
    hasMetaPixel: a.hasMetaPixel,
    hasGA: a.hasGA,
    hasGTM: a.hasGTM,
    hasBooking: a.hasBooking,
    hasChat: a.hasChat,
    hasWhatsappBtn: a.hasWhatsappBtn,
    hasForms: a.hasForms,
  };
}

/** Estágio SCORE (F4): motor ICP → grava IcpScore + prioridade do CRM. */
export async function runScore(companyId: string, scoringVersion: string): Promise<number> {
  const log = childLogger({ stage: "score", companyId });
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { rating: true, reviewCount: true, yearsActive: true },
  });
  const audit = await loadAudit(companyId);
  const ad = await prisma.adProfile.findUnique({
    where: { companyId },
    select: { runsAds: true },
  });

  const input: ScoringInput = {
    rating: company.rating,
    reviewCount: company.reviewCount,
    yearsActive: company.yearsActive,
    website: toSignals(audit),
    runsAds: ad?.runsAds ?? false,
  };
  const result = computeIcpScore(input);

  const data: Prisma.IcpScoreUncheckedCreateInput = {
    companyId,
    total: result.total,
    buyingIntent: result.buyingIntent,
    reputation: result.reputation,
    breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
    scoringVersion: result.scoringVersion ?? scoringVersion,
  };
  await prisma.icpScore.upsert({ where: { companyId }, create: data, update: data });

  log.info({ total: result.total, intent: result.buyingIntent }, "ICP score calculado");
  return result.total;
}
