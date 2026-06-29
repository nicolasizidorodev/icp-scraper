import pino, { type Logger } from "pino";

const base = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});

export type { Logger };

/** Logger raiz. Use `child` para correlacionar por campaignId/companyId/jobId. */
export const logger = base;

export function childLogger(bindings: Record<string, unknown>): Logger {
  return base.child(bindings);
}
