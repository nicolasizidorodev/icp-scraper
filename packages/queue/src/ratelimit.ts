import { getConnection } from "./connection.js";

// Token bucket por fonte, compartilhado entre réplicas de worker.
// Protege quotas de API (Places, PSI) e custo de LLM (ADR-0004).
// Implementação atômica via Lua: rejeita/concede um token e retorna ms de espera.

const LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillPerSec = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(bucket[1])
local ts = tonumber(bucket[2])
if tokens == nil then tokens = capacity; ts = now end

local elapsed = math.max(0, now - ts) / 1000
tokens = math.min(capacity, tokens + elapsed * refillPerSec)

if tokens >= requested then
  tokens = tokens - requested
  redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
  redis.call('PEXPIRE', key, 60000)
  return 0
else
  local deficit = requested - tokens
  local waitMs = math.ceil((deficit / refillPerSec) * 1000)
  redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
  redis.call('PEXPIRE', key, 60000)
  return waitMs
end
`;

export interface RateLimitOpts {
  capacity: number; // burst
  refillPerSec: number;
}

export class RateLimiter {
  constructor(
    private readonly source: string,
    private readonly opts: RateLimitOpts,
  ) {}

  /** Aguarda até ter token disponível (respeita o backpressure da fonte). */
  async acquire(n = 1): Promise<void> {
    const redis = getConnection();
    const key = `rl:${this.source}`;
    // loop de espera — em job worker isto é aceitável (concorrência limita o nº de loops)
    for (;;) {
      const wait = (await redis.eval(
        LUA,
        1,
        key,
        String(this.opts.capacity),
        String(this.opts.refillPerSec),
        String(Date.now()),
        String(n),
      )) as number;
      if (wait <= 0) return;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}
