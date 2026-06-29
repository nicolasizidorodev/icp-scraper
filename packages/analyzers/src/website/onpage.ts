import * as cheerio from "cheerio";
import type { HeadingIssues, OnpageResult } from "./types.js";

const STOP = new Set(
  "a o e de da do das dos um uma para por com sem que no na nos nas em ao aos as os se sua seu suas seus the and for with you your our we us".split(
    " ",
  ),
);

function topKeywords(text: string, n = 10): string[] {
  const freq = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[\p{L}]{4,}/gu) ?? []) {
    if (STOP.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

/** Parseia HTML → sinais onpage/SEO. Puro (sem rede), testável. */
export function parseOnpage(html: string, baseUrl: string): OnpageResult {
  const $ = cheerio.load(html);
  const base = (() => {
    try {
      return new URL(baseUrl);
    } catch {
      return undefined;
    }
  })();

  const meta = (sel: string) => $(sel).attr("content")?.trim() || undefined;
  const title = $("title").first().text().trim() || undefined;
  const description = meta('meta[name="description"]');
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || undefined;

  const metaTags: Record<string, string> = {};
  $("meta").each((_, el) => {
    const k = $(el).attr("name") || $(el).attr("property");
    const v = $(el).attr("content");
    if (k && v) metaTags[k] = v;
  });
  if (title) metaTags.title = title;
  if (canonical) metaTags.canonical = canonical;

  const h1 = $("h1").length;
  const headingIssues: HeadingIssues = {
    h1,
    h2: $("h2").length,
    h3: $("h3").length,
    multipleH1: h1 > 1,
    missingH1: h1 === 0,
  };

  let internalLinks = 0;
  let hasBlog = false;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (/blog|novidades|noticias|artigos/i.test(href)) hasBlog = true;
    try {
      const u = new URL(href, baseUrl);
      if (base && u.host === base.host) internalLinks++;
    } catch {
      /* href relativo/inválido ignorado */
    }
  });

  const bodyText = $("body").text().replace(/\s+/g, " ").slice(0, 20000);

  return {
    title,
    description,
    canonical,
    responsive: $('meta[name="viewport"]').length > 0,
    hasSchema: $('script[type="application/ld+json"]').length > 0,
    hasOG: $('meta[property^="og:"]').length > 0,
    hasFavicon: $('link[rel*="icon"]').length > 0,
    hasForms: $("form").length > 0,
    hasBlog,
    internalLinks,
    keywords: topKeywords(bodyText),
    headingIssues,
    metaTags,
  };
}
