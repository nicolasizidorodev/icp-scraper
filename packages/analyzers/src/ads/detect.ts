// Heurística de anúncios: presença de pixels/tags de mídia paga no HTML.
// Sinal de "investe em tráfego pago" (forte indicador de intenção/caixa).
// NÃO confirma campanha ativa agora — isso é o papel do Ad Library (adlibrary.ts).

export interface AdSignals {
  runsAdsLikely: boolean;
  networks: string[];
  signals: string[];
}

interface Rule {
  network: string;
  signal: string;
  re: RegExp;
}

// Regras de "intenção de ads" — tags de conversão/remarketing, não só analytics.
const RULES: Rule[] = [
  { network: "Google Ads", signal: "gtag AW-", re: /gtag\(\s*['"]config['"]\s*,\s*['"]AW-/i },
  { network: "Google Ads", signal: "AW- tag", re: /\bAW-\d{6,}/ },
  { network: "Google Ads", signal: "conversion", re: /googleadservices\.com|googleads\.g\.doubleclick\.net|\/pagead\/conversion/i },
  { network: "Meta Ads", signal: "pixel init", re: /connect\.facebook\.net\/[^"']*fbevents\.js|fbq\(\s*['"]init/i },
  { network: "Meta Ads", signal: "conversion event", re: /fbq\(\s*['"]track['"]\s*,\s*['"](?:Purchase|Lead|Contact|CompleteRegistration|Subscribe|InitiateCheckout)/i },
  { network: "TikTok Ads", signal: "tiktok pixel", re: /analytics\.tiktok\.com|ttq\.(?:load|track)/i },
  { network: "LinkedIn Ads", signal: "insight tag", re: /snap\.licdn\.com|_linkedin_partner_id/i },
  { network: "Pinterest Ads", signal: "pinterest tag", re: /pintrk\(|s\.pinimg\.com\/ct/i },
  { network: "Taboola", signal: "native ads", re: /cdn\.taboola\.com|_tfa\b/i },
  { network: "Outbrain", signal: "native ads", re: /outbrain\.com\/outbrain\.js|obApi\(/i },
];

/** Detecta sinais de mídia paga no HTML (+headers opcionais). Puro/testável. */
export function detectAdSignals(html: string, headers: Record<string, string> = {}): AdSignals {
  const hay = `${html}\n${headers["x-powered-by"] ?? ""}`;
  const networks = new Set<string>();
  const signals: string[] = [];

  for (const r of RULES) {
    if (r.re.test(hay)) {
      networks.add(r.network);
      signals.push(`${r.network}: ${r.signal}`);
    }
  }

  return {
    runsAdsLikely: networks.size > 0,
    networks: [...networks],
    signals,
  };
}
