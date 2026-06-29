import { prisma } from "@icp/db";
import {
  registerWorker,
  advanceCompany,
  enqueue,
  type CampaignJob,
  type CompanyJob,
} from "@icp/queue";
import { runDiscovery } from "./discovery.js";
import { runAnalyze } from "./analyze.js";
import { runScore } from "./score.js";
import { runOpportunities } from "./opportunities.js";
import { runProposal } from "./proposal.js";
import { runLanding } from "./landing.js";
import { runOutreach } from "./messages.js";

// Pipeline ponta-a-ponta. discover/dedupe = F2 (reais).
// Estágios de empresa ainda stub: analyze→F3 · score/opportunities→F4 ...

export function registerAllWorkers(): void {
  // ── nível campanha ──
  registerWorker("discover", async (data, { log }) => {
    const { campaignId } = data as CampaignJob;
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "DISCOVERING" },
    });

    const found = await runDiscovery(campaignId);

    // sem collectors/chaves: opção de empresa-demo p/ exercitar o pipeline offline
    if (found === 0 && process.env.DEMO_PIPELINE === "true") {
      const c = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      await prisma.company.upsert({
        where: { campaignId_dedupeKey: { campaignId, dedupeKey: `demo-${campaignId}` } },
        create: {
          campaignId,
          tenantId: c.tenantId,
          name: "Empresa Demo (offline)",
          dedupeKey: `demo-${campaignId}`,
          pipelineStage: "DISCOVER",
        },
        update: {},
      });
      await prisma.campaign.update({ where: { id: campaignId }, data: { discovered: 1 } });
      log.info("empresa-demo criada (DEMO_PIPELINE)");
    }
    await enqueue("dedupe", { campaignId });
  });

  registerWorker("dedupe", async (data, { log }) => {
    const { campaignId } = data as CampaignJob;
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "ANALYZING" },
    });

    // Empresas já são deduplicadas no insert (upsert por dedupeKey).
    // Merge cross-source acontecerá aqui quando houver >1 collector.
    const companies = await prisma.company.findMany({
      where: { campaignId, pipelineStage: "DISCOVER" },
      select: { id: true },
    });
    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    for (const { id } of companies) {
      await enqueue("enrich", {
        campaignId,
        companyId: id,
        scoringVersion: campaign.scoringVersion,
      });
    }
    log.info({ count: companies.length }, "fan-out para enrich");
  });

  // ── nível empresa (cadeia com gating) ──
  const companyStub = (stage: Parameters<typeof advanceCompany>[1], note: string) =>
    registerWorker(stage, async (data, { log }) => {
      const job = data as CompanyJob;
      log.info(`${stage.toUpperCase()} stub — ${note}`);
      await advanceCompany(job, stage);
    });

  companyStub("enrich", "F2: cnpj + resolve social");

  // ANALYZE (F3+F5): site/SEO/tech + visual + GBP + social (cada um degradável).
  registerWorker("analyze", async (data, { log }) => {
    const job = data as CompanyJob;
    await runAnalyze(job.companyId);
    log.info("ANALYZE — auditorias gravadas");
    await advanceCompany(job, "analyze");
  });

  // SCORE (F4): motor ICP → IcpScore.
  registerWorker("score", async (data, { log }) => {
    const job = data as CompanyJob;
    const total = await runScore(job.companyId, job.scoringVersion);
    log.info({ total }, "SCORE — IcpScore gravado");
    await advanceCompany(job, "score");
  });

  // OPPORTUNITIES (F4): IA (degradável → fallback por regra) → Opportunity[].
  registerWorker("opportunities", async (data, { log }) => {
    const job = data as CompanyJob;
    const n = await runOpportunities(job.companyId);
    log.info({ count: n }, "OPPORTUNITIES — gravadas");
    await advanceCompany(job, "opportunities");
  });

  // PROPOSAL (F6): proposta comercial (IA → fallback por regra).
  registerWorker("proposal", async (data, { log }) => {
    const job = data as CompanyJob;
    await runProposal(job.companyId);
    log.info("PROPOSAL — gravada");
    await advanceCompany(job, "proposal");
  });

  // LANDING (F6): copy personalizada + render HTML autônomo → LandingPage.
  registerWorker("landing", async (data, { log }) => {
    const job = data as CompanyJob;
    const slug = await runLanding(job.companyId);
    log.info({ slug }, "LANDING — gerada");
    await advanceCompany(job, "landing");
  });

  // MESSAGES (F7): outreach WhatsApp + Email (IA → fallback por regra).
  registerWorker("messages", async (data, { log }) => {
    const job = data as CompanyJob;
    const n = await runOutreach(job.companyId);
    log.info({ count: n }, "MESSAGES — gravadas");
    await advanceCompany(job, "messages");
  });

  registerWorker("finalize", async (data, { log }) => {
    const job = data as CompanyJob;
    // prioridade do CRM = ICP score (alvos quentes no topo do Kanban)
    const score = await prisma.icpScore.findUnique({
      where: { companyId: job.companyId },
      select: { total: true },
    });
    const priority = score?.total ?? 0;
    await prisma.crmCard.upsert({
      where: { companyId: job.companyId },
      create: { companyId: job.companyId, status: "NEW", priority },
      update: { priority },
    });
    await prisma.company.update({
      where: { id: job.companyId },
      data: { pipelineStage: "FINALIZE" },
    });
    await prisma.campaign.update({
      where: { id: job.campaignId },
      data: { qualified: { increment: 1 } },
    });
    log.info("FINALIZE — CrmCard criado");
  });
}
