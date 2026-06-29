// Classifica um link tido como "site". Places/Maps às vezes devolve um perfil
// de Instagram, Facebook ou agregador (linktree) no campo de site — não dá pra
// tratar isso como site real nem analisar como tal.

export type LinkKind =
  | "site"
  | "instagram"
  | "facebook"
  | "aggregator"
  | "whatsapp"
  | "other-social"
  | "none";

interface Pattern {
  kind: LinkKind;
  re: RegExp;
  /** captura o handle/identificador, quando aplicável */
  handleRe?: RegExp;
}

const PATTERNS: Pattern[] = [
  { kind: "instagram", re: /(?:\/\/|\.)instagram\.com\//i, handleRe: /instagram\.com\/([A-Za-z0-9_.]+)/i },
  { kind: "facebook", re: /(?:\/\/|\.)(?:facebook|fb)\.com\//i, handleRe: /(?:facebook|fb)\.com\/([A-Za-z0-9_.\-]+)/i },
  { kind: "whatsapp", re: /(?:wa\.me|api\.whatsapp\.com|whatsapp\.com\/send)/i },
  {
    kind: "aggregator",
    re: /(?:linktr\.ee|linktree|bio\.link|beacons\.ai|linkin\.bio|campsite\.bio|linklist\.bio|koji\.to|lnk\.bio|about\.me|flow\.page|tap\.bio)/i,
  },
  { kind: "other-social", re: /(?:\/\/|\.)(?:twitter\.com|x\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com|t\.me)/i },
];

export interface LinkClassification {
  kind: LinkKind;
  handle?: string;
}

/** Decide se a URL é um site real ou um perfil/agregador. */
export function classifyLink(url: string | null | undefined): LinkClassification {
  if (!url || !url.trim()) return { kind: "none" };
  const u = url.trim();
  for (const p of PATTERNS) {
    if (p.re.test(u)) {
      const handle = p.handleRe ? (u.match(p.handleRe)?.[1] ?? undefined) : undefined;
      return { kind: p.kind, handle: handle && !["sharer", "share"].includes(handle) ? handle : undefined };
    }
  }
  return { kind: "site" };
}
