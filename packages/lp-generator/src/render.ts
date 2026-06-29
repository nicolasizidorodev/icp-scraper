import type { LandingCopy } from "@icp/core";

export interface RenderCompany {
  name: string;
  category?: string | null;
  address?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  city?: string | null;
}

export interface RenderInput {
  company: RenderCompany;
  copy: LandingCopy;
  /** Paleta hex dominante (da análise visual). Fallback p/ tema neutro. */
  palette?: string[];
}

const DEFAULT_PALETTE = ["#0f172a", "#2563eb", "#f8fafc"];

/** Escapa HTML p/ evitar injeção a partir de conteúdo de IA/dados. */
function esc(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function waLink(num?: string | null): string | undefined {
  if (!num) return undefined;
  const digits = num.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : undefined;
}

/**
 * Renderiza a LandingCopy em um documento HTML autônomo e responsivo.
 * Puro (sem rede). Aplica guardrails legais (ADR-0006): depoimentos rotulados
 * "exemplo de layout"; nenhum ativo de terceiros embutido.
 */
export function renderLandingHtml(input: RenderInput): string {
  const { company, copy } = input;
  const [c1 = DEFAULT_PALETTE[0], c2 = DEFAULT_PALETTE[1], c3 = DEFAULT_PALETTE[2]] =
    input.palette && input.palette.length >= 2 ? input.palette : DEFAULT_PALETTE;

  const wa = waLink(copy.contact.whatsapp ?? company.whatsapp ?? company.phone);
  const address = copy.contact.address ?? company.address ?? null;
  const mapSrc = address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null;

  const benefits = copy.benefits
    .map(
      (b) =>
        `<div class="card"><h3>${esc(b.title)}</h3><p>${esc(b.description)}</p></div>`,
    )
    .join("");

  const procedures = copy.procedures.length
    ? `<section class="sec"><h2>Serviços</h2><div class="grid">${copy.procedures
        .map(
          (p) =>
            `<div class="card"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p></div>`,
        )
        .join("")}</div></section>`
    : "";

  const team = copy.team.length
    ? `<section class="sec"><h2>Equipe</h2><div class="grid">${copy.team
        .map(
          (m) =>
            `<div class="card"><div class="avatar"></div><h3>${esc(m.name)}</h3><p>${esc(
              m.role,
            )}${m.placeholder ? ' <span class="tag">exemplo</span>' : ""}</p></div>`,
        )
        .join("")}</div></section>`
    : "";

  const testimonials = copy.testimonials.length
    ? `<section class="sec alt"><h2>Depoimentos <span class="tag warn">exemplo de layout</span></h2>
       <p class="disclaimer">Os depoimentos abaixo são fictícios e servem apenas para demonstrar o layout da página.</p>
       <div class="grid">${copy.testimonials
         .map(
           (t) =>
             `<blockquote class="card"><p>“${esc(t.text)}”</p><cite>— ${esc(
               t.author,
             )} <span class="tag">exemplo</span></cite></blockquote>`,
         )
         .join("")}</div></section>`
    : "";

  const faq = copy.faq.length
    ? `<section class="sec"><h2>Perguntas frequentes</h2>${copy.faq
        .map(
          (f) =>
            `<details class="faq"><summary>${esc(f.question)}</summary><p>${esc(
              f.answer,
            )}</p></details>`,
        )
        .join("")}</section>`
    : "";

  const ctaBtn = wa
    ? `<a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">${esc(copy.hero.ctaLabel)}</a>`
    : `<a class="btn" href="#contato">${esc(copy.hero.ctaLabel)}</a>`;

  const waFloat = wa
    ? `<a class="wa-float" href="${esc(wa)}" target="_blank" rel="noopener" aria-label="WhatsApp">WhatsApp</a>`
    : "";

  const map = mapSrc
    ? `<section class="sec"><h2>Onde estamos</h2><iframe class="map" src="${esc(
        mapSrc,
      )}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></section>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(company.name)}${company.category ? ` — ${esc(company.category)}` : ""}</title>
<meta name="description" content="${esc(copy.hero.subheadline)}">
<meta name="robots" content="noindex">
<style>
:root{--c1:${esc(c1)};--c2:${esc(c2)};--c3:${esc(c3)}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:var(--c3);line-height:1.6}
.hero{background:linear-gradient(135deg,var(--c1),var(--c2));color:#fff;padding:96px 20px;text-align:center}
.hero h1{font-size:clamp(2rem,5vw,3.5rem);margin-bottom:16px;max-width:18ch;margin-inline:auto}
.hero p{font-size:1.2rem;opacity:.92;max-width:50ch;margin:0 auto 28px}
.btn{display:inline-block;background:#fff;color:var(--c1);font-weight:700;padding:14px 30px;border-radius:999px;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,.18)}
.sec{max-width:1080px;margin:0 auto;padding:64px 20px}
.sec.alt{background:#fff}
.sec h2{font-size:1.9rem;margin-bottom:28px;text-align:center}
.grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px}
.sec.alt .card{background:var(--c3)}
.card h3{color:var(--c2);margin-bottom:8px}
.avatar{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--c1),var(--c2));margin-bottom:12px}
.tag{display:inline-block;font-size:.7rem;background:#e2e8f0;color:#475569;border-radius:6px;padding:2px 6px;vertical-align:middle}
.tag.warn{background:#fef3c7;color:#92400e}
.disclaimer{text-align:center;color:#64748b;font-size:.9rem;margin-bottom:24px}
blockquote cite{display:block;margin-top:12px;font-style:normal;color:#475569}
.faq{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin-bottom:10px}
.faq summary{cursor:pointer;font-weight:600}
.faq p{margin-top:8px;color:#475569}
.map{width:100%;height:360px;border:0;border-radius:14px}
.cta{background:var(--c1);color:#fff;text-align:center;padding:72px 20px}
.cta h2{font-size:2rem;margin-bottom:24px}
.wa-float{position:fixed;right:18px;bottom:18px;background:#25d366;color:#fff;font-weight:700;padding:14px 20px;border-radius:999px;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,.25)}
footer{text-align:center;padding:28px;color:#94a3b8;font-size:.8rem}
</style>
</head>
<body>
<header class="hero">
  <h1>${esc(copy.hero.headline)}</h1>
  <p>${esc(copy.hero.subheadline)}</p>
  ${ctaBtn}
</header>

<section class="sec"><h2>Por que nos escolher</h2><div class="grid">${benefits}</div></section>
${procedures}
${team}
${testimonials}
${faq}
${map}

<section class="cta" id="contato">
  <h2>${esc(copy.hero.ctaLabel)}</h2>
  ${ctaBtn}
  ${address ? `<p style="margin-top:18px;opacity:.85">${esc(address)}</p>` : ""}
</section>

${waFloat}
<footer>Página de demonstração gerada para ${esc(company.name)}. Conteúdo ilustrativo.</footer>
</body>
</html>`;
}
