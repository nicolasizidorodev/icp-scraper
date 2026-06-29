import { getApiKey } from "@icp/secrets";
import type { PsiResult } from "./types.js";

// PageSpeed Insights v5 (Lighthouse na nuvem do Google).
// Funciona sem chave (rate-limit baixo); chave via UI/.env eleva a cota.
const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

interface PsiApiResponse {
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null }>;
    audits?: Record<
      string,
      { numericValue?: number; score?: number | null; details?: { data?: string } }
    >;
  };
}

const pct = (s?: number | null): number | undefined =>
  s == null ? undefined : Math.round(s * 100);

/** Roda PSI (mobile) p/ uma URL. Degradável: lança em erro de rede/HTTP. */
export async function runPsi(url: string, timeoutMs = 60000): Promise<PsiResult> {
  const key = await getApiKey("PAGESPEED_API_KEY");
  const params = new URLSearchParams({ url, strategy: "MOBILE" });
  for (const c of ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"]) {
    params.append("category", c);
  }
  if (key) params.set("key", key);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal: ctrl.signal });
    if (!res.ok) {
      throw new Error(`PSI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const data = (await res.json()) as PsiApiResponse;
    const cats = data.lighthouseResult?.categories ?? {};
    const audits = data.lighthouseResult?.audits ?? {};

    const lcpMs = audits["largest-contentful-paint"]?.numericValue;
    const cls = audits["cumulative-layout-shift"]?.numericValue;
    const inpMs =
      audits["interaction-to-next-paint"]?.numericValue ??
      audits["experimental-interaction-to-next-paint"]?.numericValue ??
      audits["max-potential-fid"]?.numericValue;

    // Limiares "good" do Core Web Vitals.
    const cwvPass =
      lcpMs != null && cls != null
        ? lcpMs <= 2500 && cls <= 0.1 && (inpMs == null || inpMs <= 200)
        : undefined;

    return {
      perfScore: pct(cats["performance"]?.score),
      seoScore: pct(cats["seo"]?.score),
      a11yScore: pct(cats["accessibility"]?.score),
      bestPractices: pct(cats["best-practices"]?.score),
      lcpMs: lcpMs == null ? undefined : Math.round(lcpMs),
      cls: cls == null ? undefined : Number(cls.toFixed(3)),
      inpMs: inpMs == null ? undefined : Math.round(inpMs),
      cwvPass,
      screenshot: audits["final-screenshot"]?.details?.data,
    };
  } finally {
    clearTimeout(timer);
  }
}
