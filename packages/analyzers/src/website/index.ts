import { childLogger } from "@icp/logger";
import { fetchPage, resourceExists, normalizeUrl } from "./http.js";
import { runPsi } from "./psi.js";
import { detectTech } from "./techdetect.js";
import { parseOnpage } from "./onpage.js";
import { extractPalette } from "../visual/palette.js";
import { detectSocial } from "../social/detect.js";
import { detectAdSignals } from "../ads/detect.js";
import { classifyLink } from "./classify.js";

const EMPTY_ADS = { runsAdsLikely: false, networks: [], signals: [] };
import type { AuditStatus } from "@icp/core";
import type { PsiResult, RobotsResult, TechResult, WebsiteAnalysis } from "./types.js";

const EMPTY_TECH: TechResult = {
  techStack: [],
  hasMetaPixel: false,
  hasGA: false,
  hasGTM: false,
  hasClarity: false,
  hasChat: false,
  hasWhatsappBtn: false,
  hasBooking: false,
};

/** Resolve status agregado a partir das falhas dos sub-analisadores. */
function statusFrom(failures: string[], total: number): AuditStatus {
  if (failures.length === 0) return "OK";
  if (failures.length >= total) return "FAILED";
  return "PARTIAL";
}

async function checkRobots(origin: string, failures: string[]): Promise<RobotsResult> {
  try {
    const [hasRobots, hasSitemap] = await Promise.all([
      resourceExists(`${origin}/robots.txt`),
      resourceExists(`${origin}/sitemap.xml`),
    ]);
    return { hasRobots, hasSitemap };
  } catch {
    failures.push("robots");
    return { hasRobots: false, hasSitemap: false };
  }
}

/**
 * Análise completa de site: fetch + onpage/SEO + tech-detect + PSI + robots.
 * Degradável: cada etapa falha isolada → status PARTIAL em vez de derrubar tudo.
 */
export async function analyzeWebsite(rawUrl: string | null | undefined): Promise<WebsiteAnalysis> {
  const log = childLogger({ analyzer: "website" });
  const url = rawUrl ? normalizeUrl(rawUrl) : undefined;

  if (!url) {
    return {
      exists: false,
      linkKind: "none",
      psi: {},
      tech: EMPTY_TECH,
      robots: { hasRobots: false, hasSitemap: false },
      palette: [],
      social: [],
      ads: EMPTY_ADS,
      status: "OK", // "sem site" é um resultado válido, não uma falha
      failures: [],
    };
  }

  // O "site" pode ser um perfil/agregador (Instagram, linktree…). Nesse caso
  // NÃO é site real: registra como social e não analisa como página.
  const cls = classifyLink(url);
  if (cls.kind !== "site") {
    const social =
      (cls.kind === "instagram" || cls.kind === "facebook") && cls.handle
        ? [{ network: cls.kind as "instagram" | "facebook", url, handle: cls.handle }]
        : [];
    return {
      exists: false,
      finalUrl: url,
      linkKind: cls.kind,
      psi: {},
      tech: EMPTY_TECH,
      robots: { hasRobots: false, hasSitemap: false },
      palette: [],
      social,
      ads: EMPTY_ADS,
      status: "OK",
      failures: [],
    };
  }

  const failures: string[] = [];

  // 1) fetch da home (bloqueante p/ onpage/tech; se falhar, site "não acessível")
  let page;
  try {
    page = await fetchPage(url);
    if (!page.ok) failures.push(`http:${page.status}`);
  } catch (err) {
    log.warn({ err, url }, "fetch da home falhou");
    return {
      exists: false,
      finalUrl: url,
      linkKind: "site",
      psi: {},
      tech: EMPTY_TECH,
      robots: { hasRobots: false, hasSitemap: false },
      palette: [],
      social: [],
      ads: EMPTY_ADS,
      status: "FAILED",
      failures: ["fetch"],
    };
  }

  const origin = (() => {
    try {
      return new URL(page.finalUrl).origin;
    } catch {
      return url;
    }
  })();

  // 2) onpage + tech (puros sobre o HTML) — independentes
  let onpage;
  try {
    onpage = parseOnpage(page.html, page.finalUrl);
  } catch (err) {
    log.warn({ err }, "parse onpage falhou");
    failures.push("onpage");
  }
  const tech = (() => {
    try {
      return detectTech(page.html, page.headers);
    } catch {
      failures.push("tech");
      return EMPTY_TECH;
    }
  })();

  // 3) PSI + robots em paralelo (rede; degradáveis)
  const [psi, robots] = await Promise.all([
    runPsi(page.finalUrl).catch((err): PsiResult => {
      log.warn({ err }, "PSI falhou (sem chave ou rate-limit?)");
      failures.push("psi");
      return {};
    }),
    checkRobots(origin, failures),
  ]);

  return {
    exists: true,
    finalUrl: page.finalUrl,
    linkKind: "site",
    ssl: page.ssl,
    loadTimeMs: page.loadTimeMs,
    psi,
    tech,
    onpage,
    robots,
    palette: extractPalette(page.html),
    social: detectSocial(page.html),
    ads: detectAdSignals(page.html, page.headers),
    screenshot: psi.screenshot,
    status: statusFrom(failures, 4), // fetch já passou; 4 sub-etapas restantes
    failures,
  };
}

export * from "./types.js";
export { detectTech } from "./techdetect.js";
export { parseOnpage } from "./onpage.js";
export { normalizeUrl } from "./http.js";
