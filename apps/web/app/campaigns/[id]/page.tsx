import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@icp/db";
import { Nav } from "../../_components/nav";
import { Results } from "./results";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const companies = await prisma.company.findMany({
    where: { campaignId: id },
    select: {
      id: true,
      name: true,
      category: true,
      city: true,
      website: true,
      pipelineStage: true,
      icpScore: { select: { total: true, buyingIntent: true, reputation: true } },
      landingPage: { select: { slug: true, status: true } },
      crmCard: { select: { status: true } },
      _count: { select: { opportunities: true } },
    },
  });
  companies.sort((a, b) => (b.icpScore?.total ?? -1) - (a.icpScore?.total ?? -1));

  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <div>
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-300">
            ← Campanhas
          </Link>
          <h1 className="mt-2 text-2xl font-bold">
            {campaign.niche}
            {campaign.subNiche && <span className="text-neutral-500"> · {campaign.subNiche}</span>}
          </h1>
          <p className="text-sm text-neutral-400">
            {[campaign.city, campaign.state].filter(Boolean).join("/")} · {campaign.status} ·{" "}
            {campaign.discovered} descobertas · {campaign.qualified} qualificadas
          </p>
        </div>

        <p className="text-xs text-neutral-500">Clique numa linha para ver diagnóstico, proposta, mensagens e a LP.</p>
        <Results companies={companies} />
      </main>
    </>
  );
}
