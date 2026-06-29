import { NextResponse } from "next/server";
import { CampaignInput } from "@icp/core";
import { prisma } from "@icp/db";
import { enqueue } from "@icp/queue";
import { unauthorized } from "../../_lib/auth";

export const runtime = "nodejs";

// POST /api/campaigns — cria campanha e dispara o pipeline (estágio DISCOVER).
export async function POST(req: Request) {
  const denied = unauthorized(req);
  if (denied) return denied;
  const json = await req.json().catch(() => null);
  const parsed = CampaignInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // tenant default até F8 (auth/multi-tenant real)
  const tenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    create: { name: "Default", slug: "default" },
    update: {},
  });

  const campaign = await prisma.campaign.create({
    data: { ...parsed.data, tenantId: tenant.id, status: "DRAFT" },
  });

  await enqueue("discover", { campaignId: campaign.id });

  return NextResponse.json({ id: campaign.id, status: campaign.status }, { status: 201 });
}

// GET /api/campaigns — lista campanhas com contadores.
export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      niche: true,
      city: true,
      status: true,
      discovered: true,
      analyzed: true,
      qualified: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ campaigns });
}
