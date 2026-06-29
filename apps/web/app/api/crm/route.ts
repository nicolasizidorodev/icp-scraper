import { NextResponse } from "next/server";
import { prisma } from "@icp/db";
import { unauthorized } from "../../_lib/auth";

export const runtime = "nodejs";

const STATUSES = ["NEW", "CONTACTED", "REPLIED", "MEETING", "PROPOSAL", "WON", "LOST"] as const;
type Status = (typeof STATUSES)[number];

// GET /api/crm — cartões do CRM (com empresa + score) para o Kanban.
export async function GET() {
  const cards = await prisma.crmCard.findMany({
    orderBy: { priority: "desc" },
    select: {
      id: true,
      status: true,
      priority: true,
      company: {
        select: {
          id: true,
          name: true,
          city: true,
          landingPage: { select: { slug: true } },
          icpScore: { select: { total: true } },
        },
      },
    },
  });
  return NextResponse.json({ cards });
}

// PUT /api/crm — move um cartão de status (registra evento no histórico).
export async function PUT(req: Request) {
  const denied = unauthorized(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { companyId?: string; status?: string } | null;
  if (!body?.companyId || !STATUSES.includes(body.status as Status)) {
    return NextResponse.json({ error: "companyId e status válidos obrigatórios" }, { status: 400 });
  }
  const toStatus = body.status as Status;

  const card = await prisma.crmCard.findUnique({ where: { companyId: body.companyId } });
  if (!card) return NextResponse.json({ error: "cartão não encontrado" }, { status: 404 });

  const [updated] = await prisma.$transaction([
    prisma.crmCard.update({ where: { id: card.id }, data: { status: toStatus } }),
    prisma.crmEvent.create({
      data: { cardId: card.id, fromStatus: card.status, toStatus },
    }),
  ]);
  return NextResponse.json({ status: updated.status });
}
