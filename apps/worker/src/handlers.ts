import { prisma } from "@icp/db";
import {
  registerWorker,
  advanceCompany,
  enqueue,
  type CampaignJob,
  type CompanyJob,
} from "@icp/queue";
import { runDiscovery } from "./discovery.js";

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
  companyStub("analyze", "F3: website/seo/tech + F5: visual/gbp/social");
  companyStub("score", "F4: motor ICP");
  companyStub("opportunities", "F4: ai.generateOpportunities");
  companyStub("proposal", "F6: ai.generateProposal");
  companyStub("landing", "F6: generateLandingCopy + lp-generator");
  companyStub("messages", "F7: ai.generateOutreach");

  registerWorker("finalize", async (data, { log }) => {
    const job = data as CompanyJob;
    await prisma.crmCard.upsert({
      where: { companyId: job.companyId },
      create: { companyId: job.companyId, status: "NEW", priority: 0 },
      update: {},
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
