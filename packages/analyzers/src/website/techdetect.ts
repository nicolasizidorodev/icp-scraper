import type { TechResult } from "./types.js";

// Tech-detect por assinatura no HTML/headers. Sem chamadas externas → puro e testável.

interface Signature {
  label: string;
  re: RegExp;
}

const CMS: Signature[] = [
  { label: "WordPress", re: /wp-content|wp-includes|\/wp-json/i },
  { label: "Wix", re: /static\.wixstatic\.com|wix\.com/i },
  { label: "Shopify", re: /cdn\.shopify\.com|shopify\.com/i },
  { label: "Squarespace", re: /squarespace\.com|static1\.squarespace/i },
  { label: "Webflow", re: /\.webflow\.io|webflow\.com/i },
  { label: "Joomla", re: /\/components\/com_|joomla/i },
  { label: "Drupal", re: /sites\/default\/files|drupal-settings-json/i },
];

const FRAMEWORK: Signature[] = [
  { label: "Next.js", re: /\/_next\/|__NEXT_DATA__/i },
  { label: "Nuxt", re: /\/_nuxt\/|__NUXT__/i },
  { label: "React", re: /data-reactroot|react(?:-dom)?(?:\.production)?\.min\.js/i },
  { label: "Angular", re: /ng-version=|angular(?:\.min)?\.js/i },
  { label: "Vue", re: /vue(?:\.runtime)?(?:\.min)?\.js|data-v-[0-9a-f]{8}/i },
];

const PIXELS = {
  metaPixel: /connect\.facebook\.net\/.*fbevents\.js|fbq\(\s*['"]init/i,
  ga: /google-analytics\.com\/(?:analytics|ga)\.js|gtag\(\s*['"]config['"]\s*,\s*['"]G-|googletagmanager\.com\/gtag\/js/i,
  gtm: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/,
  clarity: /clarity\.ms\/tag|window\.clarity/i,
};

const CHAT =
  /tawk\.to|crisp\.chat|intercom|zendesk|jivochat|drift\.com|zopim|widget\.manychat|chatbase/i;

const WHATSAPP = /wa\.me\/|api\.whatsapp\.com\/send|whatsapp:\/\/send|href=["'][^"']*whatsapp/i;

const BOOKING =
  /calendly\.com|cal\.com|booksy|simplybook|agendor|appointlet|setmore|acuityscheduling|doctoralia|agendamento/i;

function firstMatch(html: string, sigs: Signature[]): string | undefined {
  for (const s of sigs) if (s.re.test(html)) return s.label;
  return undefined;
}

/** Detecta stack/pixels/widgets a partir do HTML (e headers opcionais). */
export function detectTech(html: string, headers: Record<string, string> = {}): TechResult {
  const hay = `${html}\n${headers["x-powered-by"] ?? ""}\n${headers["server"] ?? ""}`;

  const cms = firstMatch(hay, CMS);
  const framework = firstMatch(hay, FRAMEWORK);

  const hasMetaPixel = PIXELS.metaPixel.test(hay);
  const hasGA = PIXELS.ga.test(hay);
  const hasGTM = PIXELS.gtm.test(hay);
  const hasClarity = PIXELS.clarity.test(hay);
  const hasChat = CHAT.test(hay);

  const techStack = [
    cms,
    framework,
    hasMetaPixel && "Meta Pixel",
    hasGA && "Google Analytics",
    hasGTM && "Google Tag Manager",
    hasClarity && "Microsoft Clarity",
    hasChat && "Chat Widget",
  ].filter(Boolean) as string[];

  return {
    cms,
    framework,
    techStack,
    hasMetaPixel,
    hasGA,
    hasGTM,
    hasClarity,
    hasChat,
    hasWhatsappBtn: WHATSAPP.test(hay),
    hasBooking: BOOKING.test(hay),
  };
}
