import { getEnv } from "@icp/config";
import { logger } from "@icp/logger";
import { registerAllWorkers } from "./handlers.js";

// Registra os workers BullMQ de todos os estágios do pipeline (F1).
async function main(): Promise<void> {
  const env = getEnv();
  const log = logger.child({ service: "worker" });

  registerAllWorkers();
  log.info({ provider: env.LLM_PROVIDER }, "worker pronto — 10 estágios registrados");

  const shutdown = (sig: string) => {
    log.info({ sig }, "encerrando worker");
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "worker falhou ao iniciar");
  process.exit(1);
});
