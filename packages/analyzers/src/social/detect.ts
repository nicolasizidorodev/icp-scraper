// Detecção de perfis sociais a partir de links no site + dados da empresa.
// SEM scraping (ToS): só registra presença/handle/url. Métricas ficam nulas.

export interface SocialHit {
  network: "instagram" | "facebook" | "linkedin";
  url: string;
  handle?: string;
}

const PATTERNS: { network: SocialHit["network"]; re: RegExp }[] = [
  { network: "instagram", re: /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/i },
  { network: "facebook", re: /https?:\/\/(?:www\.)?facebook\.com\/([A-Za-z0-9_.\-/]+)/i },
  { network: "linkedin", re: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/([A-Za-z0-9_.\-]+)/i },
];

const SKIP = new Set(["sharer", "share", "plugins", "tr", "home", "profile.php"]);

/** Encontra perfis sociais em HTML + campos já conhecidos da empresa. */
export function detectSocial(
  html: string,
  known?: { instagram?: string | null; facebook?: string | null; linkedin?: string | null },
): SocialHit[] {
  const found = new Map<SocialHit["network"], SocialHit>();

  const add = (network: SocialHit["network"], url?: string | null, handle?: string) => {
    if (!url || found.has(network)) return;
    found.set(network, { network, url, handle });
  };

  for (const { network, re } of PATTERNS) {
    const m = html.match(re);
    if (!m || !m[1]) continue;
    const seg = m[1].replace(/\/+$/, "").split("/")[0]!.toLowerCase();
    if (SKIP.has(seg) || seg.includes(".php")) continue;
    add(network, m[0], seg);
  }

  if (known?.instagram) add("instagram", known.instagram);
  if (known?.facebook) add("facebook", known.facebook);
  if (known?.linkedin) add("linkedin", known.linkedin);

  return [...found.values()];
}
