import { Worker, type Job } from "bullmq";
import { getEnv } from "@icp/config";
import { childLogger } from "@icp/logger";
import { prisma } from "@icp/db";
import { getConnection } from "./connection.js";
import { enqueue } from "./queues.js";
import {
  QUEUES,
  type QueueName,
  type JobData,
  type CompanyJob,
  isCompanyJob,
  stageToPipeline,
} from "./types.js";
import { jobStarted, jobDone, jobFailed } from "./jobtracker.js";

// Cadeia de estágios por empresa (gating linear). 6-9 podem virar paralelos depois.
const COMPANY_STAGE_ORDER: QueueName[] = [
  "enrich",
  "analyze",
  "score",
  "opportunities",
  "proposal",
  "landing",
  "messages",
  "finalize",
];

/** Avança a empresa para o próximo estágio (gating). No-op se for o último. */
export async function advanceCompany(job: CompanyJob, current: QueueName): Promise<void> {
  const idx = COMPANY_STAGE_ORDER.indexOf(current);
  const next = idx >= 0 ? COMPANY_STAGE_ORDER[idx + 1] : undefined;
  await prisma.company.update({
    where: { id: job.companyId },
    data: { pipelineStage: stageToPipeline(next ?? current) },
  });
  if (next) await enqueue(next, job);
}

export type StageHandler<T extends JobData = JobData> = (
  data: T,
  ctx: { job: Job; log: ReturnType<typeof childLogger> },
) => Promise<void>;

/**
 * Registra um worker para um estágio com tracking de JobRun e tratamento de erro.
 * Concorrência configurável; ANALYZE usa MAX_CONCURRENCY_ANALYZE.
 */
export function registerWorker(name: QueueName, handler: StageHandler): Worker {
  const env = getEnv();
  const concurrency = name === "analyze" ? env.MAX_CONCURRENCY_ANALYZE : 5;

  const worker = new Worker(
    QUEUES[name],
    async (job: Job) => {
      const data = job.data as JobData;
      const log = childLogger({
        stage: name,
        campaignId: data.campaignId,
        companyId: isCompanyJob(data) ? data.companyId : undefined,
        jobId: job.id,
      });
      const runId = await jobStarted(name, data, job.attemptsMade + 1);
      try {
        await handler(data, { job, log });
        await jobDone(runId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error({ err }, "estágio falhou");
        await jobFailed(runId, msg);
        throw err; // deixa o BullMQ aplicar retry/backoff
      }
    },
    { connection: getConnection(), concurrency },
  );

  worker.on("failed", (job, err) => {
    childLogger({ stage: name, jobId: job?.id }).warn({ err: err.message }, "job failed");
  });
  return worker;
}
