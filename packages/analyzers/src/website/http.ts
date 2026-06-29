import type { FetchResult } from "./types.js";

const UA =
  "Mozilla/5.0 (compatible; ICPProspectorBot/1.0; +https://icp-prospector.local/bot)";

/** Normaliza uma URL de site (adiciona https:// se faltar protocolo). */
export function normalizeUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    return new URL(withProto).toString();
  } catch {
    return undefined;
  }
}

/** GET com timeout + UA. Segue redirects (finalUrl reflete destino). */
export async function fetchPage(url: string, timeoutMs = 15000): Promise<FetchResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    });
    const html = await res.text();
    const finalUrl = res.url || url;
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));
    return {
      ok: res.ok,
      status: res.status,
      finalUrl,
      html,
      ssl: finalUrl.startsWith("https://"),
      loadTimeMs: Date.now() - started,
      headers,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** HEAD/GET leve só p/ checar existência (robots.txt, sitemap.xml). */
export async function resourceExists(url: string, timeoutMs = 8000): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      method: "GET",
      headers: { "User-Agent": UA },
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
