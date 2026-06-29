import { getProvider } from "./provider.js";

const SYSTEM = `Você é um web designer sênior especialista em landing pages de alta conversão
para pequenos negócios locais. Produza UM documento HTML completo que é um TEMPLATE de
landing page (não conteúdo final). Regras OBRIGATÓRIAS:
- Saída = só o HTML (começando em <!doctype html>), sem markdown, sem comentários extras.
- NÃO escreva conteúdo real. Use EXATAMENTE estes marcadores onde o texto entra:
  {{TITLE}} (no <title>), {{HERO_HEADLINE}}, {{HERO_SUB}}, {{CTA_LABEL}}, {{CTA_HREF}} (href do CTA),
  {{COMPANY_NAME}}, {{ADDRESS}}, {{MAP_SRC}} (src do iframe), {{WA_HREF}}, {{DESCRIPTION}} (meta).
- Paleta via CSS custom properties no :root: --c1:{{C1}};--c2:{{C2}};--c3:{{C3}} e use var(--c1/2/3).
- Logo opcional: <!--IF:HAS_LOGO--><img src="{{LOGO_URL}}" alt="{{COMPANY_NAME}}"><!--END:IF:HAS_LOGO-->
- Blocos repetidos (use exatamente esta sintaxe de comentário):
  <!--EACH:BENEFITS-->...{{title}}...{{description}}...<!--END:EACH:BENEFITS-->
  <!--EACH:PROCEDURES-->...{{name}}...{{description}}...<!--END:EACH:PROCEDURES-->
  <!--EACH:TEAM-->...{{name}}...{{role}}{{tag}}...<!--END:EACH:TEAM-->
  <!--EACH:TESTIMONIALS-->...{{text}}...{{author}}...<!--END:EACH:TESTIMONIALS-->
  <!--EACH:FAQ-->...{{question}}...{{answer}}...<!--END:EACH:FAQ-->
- Seções opcionais envoltas em: <!--IF:HAS_PROCEDURES-->...<!--END:IF:HAS_PROCEDURES--> (idem
  HAS_TEAM, HAS_TESTIMONIALS, HAS_FAQ, HAS_MAP, HAS_ADDRESS, HAS_WA).
- Depoimentos: rotule a seção como "exemplo de layout" e inclua frase de que são fictícios (lei).
- CSS inline no <head>, responsivo (mobile-first), <meta name="viewport"> e <meta name="robots" content="noindex">.
- Português do Brasil.`;

/** Gera um TEMPLATE de landing page (com marcadores) via LLM, ajustado ao nicho. */
export async function generateLandingTemplate(opts: {
  niche: string;
  style?: string;
  feedback?: string;
  provider?: "claude" | "openai";
}): Promise<string> {
  const provider = getProvider(opts.provider);
  const style = opts.style ? `Estilo desejado: ${opts.style}.` : "";
  const fix = opts.feedback ? `\nCorrija: ${opts.feedback}` : "";

  const text = await provider.complete({
    system: SYSTEM,
    tier: "longform",
    temperature: 0.7,
    maxTokens: 8000,
    prompt: `Crie o template de landing page para o nicho: "${opts.niche}". ${style} Capriche no visual (hero forte, hierarquia, espaçamento, microdetalhes). Retorne só o HTML.${fix}`,
  });

  // remove cercas markdown se vierem
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? text).trim();
}
