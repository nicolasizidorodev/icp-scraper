// Template default da LP (fallback). Quando houver um template desenhado no
// Stitch, ele entra no lugar deste — mesmos marcadores ({{}}, EACH, IF).
export const DEFAULT_TEMPLATE = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<meta name="description" content="{{DESCRIPTION}}">
<meta name="robots" content="noindex">
<style>
:root{--c1:{{C1}};--c2:{{C2}};--c3:{{C3}}}
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
  <!--IF:HAS_LOGO--><img src="{{LOGO_URL}}" alt="{{COMPANY_NAME}}" style="height:56px;margin:0 auto 20px;display:block;object-fit:contain"><!--END:IF:HAS_LOGO-->
  <h1>{{HERO_HEADLINE}}</h1>
  <p>{{HERO_SUB}}</p>
  <a class="btn" href="{{CTA_HREF}}" target="_blank" rel="noopener">{{CTA_LABEL}}</a>
</header>

<section class="sec"><h2>Por que nos escolher</h2><div class="grid">
<!--EACH:BENEFITS--><div class="card"><h3>{{title}}</h3><p>{{description}}</p></div><!--END:EACH:BENEFITS-->
</div></section>

<!--IF:HAS_PROCEDURES-->
<section class="sec"><h2>Serviços</h2><div class="grid">
<!--EACH:PROCEDURES--><div class="card"><h3>{{name}}</h3><p>{{description}}</p></div><!--END:EACH:PROCEDURES-->
</div></section>
<!--END:IF:HAS_PROCEDURES-->

<!--IF:HAS_TEAM-->
<section class="sec"><h2>Equipe</h2><div class="grid">
<!--EACH:TEAM--><div class="card"><div class="avatar"></div><h3>{{name}}</h3><p>{{role}}{{tag}}</p></div><!--END:EACH:TEAM-->
</div></section>
<!--END:IF:HAS_TEAM-->

<!--IF:HAS_TESTIMONIALS-->
<section class="sec alt"><h2>Depoimentos <span class="tag warn">exemplo de layout</span></h2>
<p class="disclaimer">Os depoimentos abaixo são fictícios e servem apenas para demonstrar o layout da página.</p>
<div class="grid">
<!--EACH:TESTIMONIALS--><blockquote class="card"><p>&ldquo;{{text}}&rdquo;</p><cite>&mdash; {{author}} <span class="tag">exemplo</span></cite></blockquote><!--END:EACH:TESTIMONIALS-->
</div></section>
<!--END:IF:HAS_TESTIMONIALS-->

<!--IF:HAS_FAQ-->
<section class="sec"><h2>Perguntas frequentes</h2>
<!--EACH:FAQ--><details class="faq"><summary>{{question}}</summary><p>{{answer}}</p></details><!--END:EACH:FAQ-->
</section>
<!--END:IF:HAS_FAQ-->

<!--IF:HAS_MAP-->
<section class="sec"><h2>Onde estamos</h2><iframe class="map" src="{{MAP_SRC}}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></section>
<!--END:IF:HAS_MAP-->

<section class="cta" id="contato">
  <h2>{{CTA_LABEL}}</h2>
  <a class="btn" href="{{CTA_HREF}}" target="_blank" rel="noopener">{{CTA_LABEL}}</a>
  <!--IF:HAS_ADDRESS--><p style="margin-top:18px;opacity:.85">{{ADDRESS}}</p><!--END:IF:HAS_ADDRESS-->
</section>

<!--IF:HAS_WA--><a class="wa-float" href="{{WA_HREF}}" target="_blank" rel="noopener" aria-label="WhatsApp">WhatsApp</a><!--END:IF:HAS_WA-->
<footer>Página de demonstração gerada para {{COMPANY_NAME}}. Conteúdo ilustrativo.</footer>
</body>
</html>`;
