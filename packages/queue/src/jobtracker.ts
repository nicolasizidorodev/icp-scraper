import { prisma } from "@icp/db";
import type { JobData } from "./types.js";
import { isCompanyJob, type QueueName, stageToPipeline } from "./types.js";

// Cria/atualiza JobRun para observabilidade do pipeline (dashboard ao vivo).

export async function jobStarted(stage: QueueName, data: JobData, attempt: number): Promise<string> {
  const run = await prisma.jobRun.create({
    data: {
      stage: stageToPipeline(stage),
      status: "RUNNING",
      attempt,
      startedAt: new Date(),
      campaignId: data.campaignId,
      companyId: isCompanyJob(data) ? data.companyId : null,
    },
  });
  return run.id;
}

export async function jobDone(id: string, progress = 100): Promise<void> {
  await prisma.jobRun.update({
    where: { id },
    data: { status: "DONE", progress, finishedAt: new Date() },
  });
}

export async function jobFailed(id: string, error: string): Promise<void> {
  await prisma.jobRun.update({
    where: { id },
    data: { status: "FAILED", error: error.slice(0, 2000), finishedAt: new Date() },
  });
}
