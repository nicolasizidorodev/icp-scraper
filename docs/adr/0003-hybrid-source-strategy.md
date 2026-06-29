# ADR-0003 — Estratégia híbrida de fontes de dados

**Status:** Aceito · **Data:** 2026-06-29

## Contexto
O sistema precisa descobrir empresas e enriquecê-las com dados de Maps, site, redes sociais e CNPJ. Scraping direto de Google Maps, Instagram, Facebook e LinkedIn **viola os ToS** dessas plataformas, é frágil (quebra a cada mudança de DOM) e traz risco de bloqueio/IP ban e exposição legal (Meta processa scrapers; LinkedIn litiga ativamente).

## Decisão
**Híbrido**, com tudo atrás da interface `ICollector` (trocável por fonte):
- **Descoberta** → Google **Places API** (oficial, paga, estável). Primária.
- **Site-alvo** → Playwright + Cheerio, **somente o próprio site da empresa** (dado público do prospect, não de plataforma de terceiro).
- **CNPJ** → BrasilAPI/ReceitaWS (dado público).
- **IG/Facebook/LinkedIn** → **sem scraping por padrão** (`SOCIAL_ANALYSIS_ENABLED=false`). Quando ligado, via API oficial ou provider pago (Apify, atrás de flag) que assume o risco no terceiro.

## Alternativas
- **Scraping direto de tudo**: barato, mas ToS-violating, frágil, ban/legal. Rejeitado como default (implementável atrás da mesma interface se o usuário aceitar o risco).
- **Só APIs oficiais**: mais caro, cobertura menor de extras. Adotado para o núcleo, complementado por Playwright no site-alvo.

## Consequências
+ Legal/estável no caminho padrão; provider trocável sem tocar no pipeline.
+ Custo previsível (quota de API) + rate limit central.
− Cobertura de IG/LI limitada no default; alguns dados só com provider pago.
