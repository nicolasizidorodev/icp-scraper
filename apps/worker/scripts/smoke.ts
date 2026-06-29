/**
 * Smoke test do pipeline ponta-a-ponta (offline).
 *
 * Pré-requisitos:
 *  1. Postgres + Redis no ar (pnpm infra:up) e schema aplicado (pnpm db:push).
 *  2. Worker rodando EM OUTRO terminal COM a flag de demo:
 *       DEMO_PIPELINE=true pnpm --filter @icp/worker dev
 *     (sem chaves de API: discover cria 1 empresa-demo e todos os estágios de
 *      IA caem no fallback determinístico por regra.)
 *
 * Este script cria uma campanha, dispara o pipeline e aguarda a empresa chegar
 * em FINALIZE, validando que cada artefato foi gravado. Sai 0 (ok) ou 1 (falha).
 */
import { prisma } from "@icp/db";
import { enqueue } from "@icp/queue";
import { ensureDefaultTenant } from "@icp/secrets";

const TIMEOUT_MS = 120_000;
const POLL_MS = 2_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const tenantId = await ensureDefaultTenant();
  const campaign = await prisma.campaign.create({
    data: {
      tenantId,
      niche: "Clínica Odontológica (smoke)",
      city: "São Paulo",
      state: "SP",
      country: "BR",
      maxCompanies: 1,
      status: "DRAFT",
    },
  });
  console.log(`[smoke] campanha criada: ${campaign.id}`);
  await enqueue("discover", { campaignId: campaign.id });
  console.log("[smoke] discover enfileirado — aguardando worker…");

  const deadline = Date.now() + TIMEOUT_MS;
  let company:
    | Awaited<ReturnType<typeof loadCompany>>
    | null = null;

  while (Date.now() < deadline) {
    company = await loadCompany(campaign.id);
    if (company) {
      console.log(`[smoke] estágio atual: ${company.pipelineStage}`);
      if (company.pipelineStage === "FINALIZE") break;
    }
    await sleep(POLL_MS);
  }

  if (!company) {
    fail("nenhuma empresa criada — worker rodando? DEMO_PIPELINE=true setado?");
  }
  if (company.pipelineStage !== "FINALIZE") {
    fail(`pipeline não finalizou a tempo (parou em ${company.pipelineStage})`);
  }

  const checks: [string, boolean][] = [
    ["IcpScore", !!company.icpScore],
    ["Opportunity (>=1)", company.opportunities.length > 0],
    ["Proposal", !!company.proposal],
    ["LandingPage + html", !!company.landingPage?.html],
    ["OutreachMessage (>=1)", company.messages.length > 0],
    ["CrmCard", !!company.crmCard],
  ];

  console.log("\n[smoke] artefatos:");
  let ok = true;
  for (const [label, present] of checks) {
    console.log(`  ${present ? "✓" : "✗"} ${label}`);
    if (!present) ok = false;
  }

  if (company.icpScore) {
    console.log(`\n[smoke] ICP score: ${company.icpScore.total} (intenção ${company.icpScore.buyingIntent})`);
  }
  if (company.landingPage) {
    console.log(`[smoke] landing page: ${company.landingPage.url ?? `/lp/${company.landingPage.slug}`}`);
  }

  if (!ok) fail("um ou mais artefatos não foram gerados");
  console.log("\n[smoke] OK — pipeline ponta-a-ponta verde.");
  await prisma.$disconnect();
  process.exit(0);
}

function loadCompany(campaignId: string) {
  return prisma.company.findFirst({
    where: { campaignId },
    include: {
      icpScore: true,
      opportunities: true,
      proposal: true,
      landingPage: true,
      crmCard: true,
      messages: true,
    },
  });
}

function fail(msg: string): never {
  console.error(`\n[smoke] FALHA: ${msg}`);
  process.exit(1);
}

main().catch((err) => {
  console.error("[smoke] erro inesperado:", err);
  process.exit(1);
});
