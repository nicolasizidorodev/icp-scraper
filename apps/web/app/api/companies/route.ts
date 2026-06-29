import { NextResponse } from "next/server";
import { prisma } from "@icp/db";

export const runtime = "nodejs";

// GET /api/companies?campaignId=... — empresas com score, oportunidades e LP.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId obrigatório" }, { status: 400 });
  }

  const companies = await prisma.company.findMany({
    where: { campaignId },
    select: {
      id: true,
      name: true,
      category: true,
      city: true,
      website: true,
      pipelineStage: true,
      rating: true,
      reviewCount: true,
      icpScore: { select: { total: true, buyingIntent: true, reputation: true } },
      landingPage: { select: { slug: true, status: true } },
      crmCard: { select: { status: true } },
      _count: { select: { opportunities: true } },
    },
  });

  // ordena por ICP score desc (alvos quentes no topo)
  companies.sort((a, b) => (b.icpScore?.total ?? -1) - (a.icpScore?.total ?? -1));
  return NextResponse.json({ companies });
}
