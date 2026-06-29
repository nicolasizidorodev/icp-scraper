import { Queue, type JobsOptions } from "bullmq";
import { getConnection } from "./connection.js";
import { QUEUES, type QueueName, type JobData } from "./types.js";

const DEFAULT_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 86400 },
};

const instances = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let q = instances.get(name);
  if (!q) {
    q = new Queue(QUEUES[name], { connection: getConnection() });
    instances.set(name, q);
  }
  return q;
}

export async function enqueue(
  name: QueueName,
  data: JobData,
  opts?: JobsOptions,
): Promise<void> {
  await getQueue(name).add(name, data, { ...DEFAULT_OPTS, ...opts });
}
