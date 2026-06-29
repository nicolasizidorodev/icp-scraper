import { getApiKey } from "@icp/secrets";

// Meta Ad Library API — confirma anúncios ATIVOS por nome da página.
// Requer META_AD_LIBRARY_TOKEN (chave via UI/.env). Degradável: sem token → null.
// ⚠️ Cobertura: a API oficial retorna de forma ampla anúncios de tópicos
// sociais/políticos; anúncios comerciais de PMEs podem não vir por aqui em
// todas as regiões. A heurística (detect.ts) cobre o caso comum; este é o
// reforço "campanha ativa" quando disponível.
const ENDPOINT = "https://graph.facebook.com/v21.0/ads_archive";

export interface AdLibraryResult {
  activeAds: number;
  pageNames: string[];
}

interface AdsArchiveResponse {
  data?: { id?: string; page_name?: string }[];
  error?: { message?: string };
}

/** Consulta a Meta Ad Library por termo (nome da empresa). null se sem token/erro. */
export async function fetchMetaAds(
  searchTerms: string,
  country = "BR",
): Promise<AdLibraryResult | null> {
  const token = await getApiKey("META_AD_LIBRARY_TOKEN");
  if (!token) return null;

  const params = new URLSearchParams({
    search_terms: searchTerms,
    ad_reached_countries: `["${country}"]`,
    ad_active_status: "ACTIVE",
    fields: "id,page_name",
    limit: "50",
    access_token: token,
  });

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as AdsArchiveResponse;
    if (data.error || !data.data) return null;
    const pageNames = [...new Set(data.data.map((d) => d.page_name).filter((n): n is string => !!n))];
    return { activeAds: data.data.length, pageNames };
  } catch {
    return null;
  }
}
