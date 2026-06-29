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
      rating: true,
      reviewCount: true,
      pipelineStage: true,
      icpScore: { select: { total: true, buyingIntent: true, reputation: true } },
      landingPage: { select: { slug: true, status: true } },
      crmCard: { select: { status: true } },
      websiteAudit: { select: { exists: true, linkKind: true } },
      gbp: { select: { rating: true } },
      adProfile: { select: { runsAds: true } },
      socialProfiles: { select: { network: true } },
      _count: { select: { opportunities: true } },
    },
  });
  companies.sort((a, b) => (b.icpScore?.total ?? -1) - (a.icpScore?.total ?? -1));

  // KPIs agregados (com %), inspirados em painéis de prospecção
  const n = companies.length;
  const pct = (x: number) => (n ? Math.round((x / n) * 100) : 0);
  const semSite = companies.filter((c) => !c.websiteAudit?.exists).length;
  const comIg = companies.filter((c) => c.socialProfiles.some((s) => s.network === "instagram")).length;
  const ads = companies.filter((c) => c.adProfile?.runsAds).length;
  const comGbp = companies.filter((c) => c.gbp).length;
  const noCrm = companies.filter((c) => c.crmCard).length;
  const quentes = companies.filter((c) => (c.icpScore?.total ?? 0) >= 70).length;

  const kpis = [
    { label: "Empresas", value: n, hint: "no banco", color: "text-neutral-100" },
    { label: "Sem site", value: semSite, hint: `${pct(semSite)}% · oportunidade direta`, color: "text-amber-400" },
    { label: "Alvos quentes", value: quentes, hint: `${pct(quentes)}% · ICP ≥ 70`, color: "text-emerald-400" },
    { label: "Rodam ads", value: ads, hint: `${pct(ads)}% · investe em tráfego`, color: "text-sky-400" },
    { label: "Com Instagram", value: comIg, hint: `${pct(comIg)}%`, color: "text-pink-400" },
    { label: "Com Google Business", value: comGbp, hint: `${pct(comGbp)}%`, color: "text-violet-400" },
    { label: "No CRM", value: noCrm, hint: `${pct(noCrm)}% · qualificadas`, color: "text-teal-400" },
  ];

  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
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
            {campaign.discovered} descobertas
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">{k.label}</div>
              <div className={`mt-1 text-2xl font-bold tabular-nums ${k.color}`}>{k.value}</div>
              <div className="text-[11px] text-neutral-500">{k.hint}</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-neutral-500">Clique numa linha para ver diagnóstico, proposta, mensagens e a LP.</p>
        <Results companies={companies} />
      </main>
    </>
  );
}
