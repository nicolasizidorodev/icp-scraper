import { prisma } from "@icp/db";
import { childLogger } from "@icp/logger";
import { getEnabledCollectors, dedupeKey } from "@icp/collectors";
import { RateLimiter } from "@icp/queue";
import type { CampaignInput, CompanyDraft } from "@icp/core";

function draftToCompany(d: CompanyDraft) {
  return {
    name: d.name,
    phone: d.phone ?? null,
    whatsapp: d.whatsapp ?? null,
    email: d.email ?? null,
    website: d.website ?? null,
    instagram: d.instagram ?? null,
    facebook: d.facebook ?? null,
    linkedin: d.linkedin ?? null,
    googlePlaceId: d.googlePlaceId ?? null,
    category: d.category ?? null,
    cnpj: d.cnpj ?? null,
    address: d.address ?? null,
    city: d.city ?? null,
    state: d.state ?? null,
    country: d.country ?? null,
    lat: d.lat ?? null,
    lng: d.lng ?? null,
    rating: d.rating ?? null,
    reviewCount: d.reviewCount ?? null,
    photoCount: d.photoCount ?? null,
  };
}

async function persist(
  campaignId: string,
  tenantId: string,
  key: string,
  d: CompanyDraft,
): Promise<void> {
  const fields = draftToCompany(d);
  const company = await prisma.company.upsert({
    where: { campaignId_dedupeKey: { campaignId, dedupeKey: key } },
    create: { campaignId, tenantId, dedupeKey: key, pipelineStage: "DISCOVER", ...fields },
    update: fields, // re-execução atualiza; merge cross-source vem via CompanySource
  });
  await prisma.companySource.upsert({
    where: { companyId_source: { companyId: company.id, source: d.source } },
    create: { companyId: company.id, source: d.source, raw: d.raw as object },
    update: { raw: d.raw as object, fetchedAt: new Date() },
  });
}

/** Executa todos os collectors habilitados, deduplica e persiste. Retorna nº de empresas únicas. */
export async function runDiscovery(campaignId: string): Promise<number> {
  const c = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const log = childLogger({ stage: "discover", campaignId });

  const collectors = await getEnabledCollectors();
  if (collectors.length === 0) {
    log.warn("nenhum collector habilitado (faltam chaves de API?) — descoberta vazia");
    return 0;
  }

  const input: CampaignInput = {
    niche: c.niche,
    subNiche: c.subNiche ?? undefined,
    city: c.city,
    state: c.state ?? undefined,
    country: c.country,
    maxCompanies: c.maxCompanies,
  };

  const ctrl = new AbortController();
  const seen = new Set<string>();

  for (const collector of collectors) {
    const rateLimit = new RateLimiter(collector.name, { capacity: 10, refillPerSec: 5 });
    try {
      for await (const draft of collector.discover({
        campaign: input,
        signal: ctrl.signal,
        rateLimit,
        logger: log,
      })) {
        const key = dedupeKey(draft);
        await persist(campaignId, c.tenantId, key, draft);
        seen.add(key);
        if (seen.size >= input.maxCompanies) {
          ctrl.abort();
          break;
        }
      }
    } catch (err) {
      // collector degradável: um falho não derruba a campanha
      log.error({ err, collector: collector.name }, "collector falhou");
    }
  }

  await prisma.campaign.update({ where: { id: campaignId }, data: { discovered: seen.size } });
  log.info({ count: seen.size }, "descoberta concluída");
  return seen.size;
}
