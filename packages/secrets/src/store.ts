import { prisma } from "@icp/db";
import { encrypt, decrypt } from "./crypto.js";

// Chaves gerenciáveis pela UI. Cada uma também aceita fallback via env de mesmo nome.
export const MANAGED_KEYS = [
  "GOOGLE_PLACES_API_KEY",
  "PAGESPEED_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "META_AD_LIBRARY_TOKEN",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "APIFY_TOKEN",
] as const;

export type ManagedKey = (typeof MANAGED_KEYS)[number];

export interface KeyStatus {
  name: ManagedKey;
  isSet: boolean;
  last4: string | null;
  source: "db" | "env" | "none";
}

const cache = new Map<string, string>();

/** Tenant default até multi-tenant/auth (F8). */
export async function ensureDefaultTenant(): Promise<string> {
  const t = await prisma.tenant.upsert({
    where: { slug: "default" },
    create: { name: "Default", slug: "default" },
    update: {},
  });
  return t.id;
}

/** Resolve uma chave: DB (criptografada) tem prioridade; senão, env de mesmo nome. */
export async function getApiKey(name: string, tenantId?: string): Promise<string | undefined> {
  const tid = tenantId ?? (await ensureDefaultTenant());
  const ck = `${tid}:${name}`;
  if (cache.has(ck)) return cache.get(ck);

  const row = await prisma.apiKey.findUnique({
    where: { tenantId_name: { tenantId: tid, name } },
  });
  if (row) {
    const val = decrypt(row.ciphertext);
    cache.set(ck, val);
    return val;
  }
  return process.env[name] || undefined;
}

export async function setApiKey(name: string, value: string, tenantId?: string): Promise<void> {
  const tid = tenantId ?? (await ensureDefaultTenant());
  const last4 = value.slice(-4);
  await prisma.apiKey.upsert({
    where: { tenantId_name: { tenantId: tid, name } },
    create: { tenantId: tid, name, ciphertext: encrypt(value), last4 },
    update: { ciphertext: encrypt(value), last4 },
  });
  cache.delete(`${tid}:${name}`);
}

export async function deleteApiKey(name: string, tenantId?: string): Promise<void> {
  const tid = tenantId ?? (await ensureDefaultTenant());
  await prisma.apiKey
    .delete({ where: { tenantId_name: { tenantId: tid, name } } })
    .catch(() => undefined);
  cache.delete(`${tid}:${name}`);
}

/** Status mascarado de todas as chaves gerenciadas (p/ a UI — nunca devolve o valor). */
export async function listApiKeyStatus(tenantId?: string): Promise<KeyStatus[]> {
  const tid = tenantId ?? (await ensureDefaultTenant());
  const rows = await prisma.apiKey.findMany({ where: { tenantId: tid } });
  const byName = new Map(rows.map((r) => [r.name, r]));
  return MANAGED_KEYS.map((name) => {
    const row = byName.get(name);
    if (row) return { name, isSet: true, last4: row.last4, source: "db" as const };
    if (process.env[name]) {
      return { name, isSet: true, last4: process.env[name]!.slice(-4), source: "env" as const };
    }
    return { name, isSet: false, last4: null, source: "none" as const };
  });
}
