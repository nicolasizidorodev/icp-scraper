import { NextResponse } from "next/server";
import { prisma } from "@icp/db";

export const runtime = "nodejs";

// GET /api/companies/[id] — diagnóstico completo de uma empresa.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      icpScore: true,
      opportunities: { orderBy: { severity: "desc" } },
      proposal: true,
      landingPage: { select: { slug: true, status: true, url: true } },
      messages: true,
      websiteAudit: true,
      adProfile: true,
      gbp: true,
      socialProfiles: true,
      crmCard: true,
    },
  });
  if (!company) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  return NextResponse.json({ company });
}
