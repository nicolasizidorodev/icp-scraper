import { Redis } from "ioredis";
import { getEnv } from "@icp/config";

// Conexão única compartilhada por filas e workers.
// maxRetriesPerRequest=null é exigência do BullMQ.
let conn: Redis | null = null;

export function getConnection(): Redis {
  if (conn) return conn;
  const { REDIS_URL } = getEnv();
  conn = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  return conn;
}
