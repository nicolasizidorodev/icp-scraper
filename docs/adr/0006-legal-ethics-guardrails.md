# ADR-0006 — Guardrails legais e éticos

**Status:** Aceito · **Data:** 2026-06-29

## Contexto
O sistema coleta dados de empresas, gera análises e cria material de marketing automaticamente. Há riscos legais concretos: ToS de plataformas, LGPD, direitos autorais sobre ativos, e propaganda enganosa (CONAR/CDC no Brasil, FTC fora).

## Decisão — regras inegociáveis
1. **Coleta** só de dado público / via API oficial. Sem scraping de IG/Facebook/LinkedIn por padrão (ver ADR-0003).
2. **Depoimentos fictícios** nas LPs: SEMPRE rotulados de forma clara e visível como "exemplo de layout" — nunca apresentados como avaliações reais. (Apresentar fake como real = propaganda enganosa, ilegal.)
3. **Ativos protegidos**: não copiar logos/fotos/textos de terceiros como ativos da LP gerada. Só cores/estilo derivados + placeholders.
4. **Dados pessoais** (LGPD): tratar dado de contato comercial com base legal de legítimo interesse para B2B; não armazenar dado sensível; permitir expurgo por empresa.
5. **Outreach anti-spam**: mensagens personalizadas com problema real encontrado; respeitar opt-out; nunca disparo em massa idêntico.
6. **Segredos**: chaves de API só no server/worker, nunca no client; `.env` fora do git.

## Consequências
+ Reduz risco legal/reputacional; sustentável a longo prazo.
+ Guardrails viram validações no código (`lp-generator` recusa depoimento não rotulado).
− Algumas capacidades "agressivas" ficam atrás de flag explícita com aceite de risco do operador.
