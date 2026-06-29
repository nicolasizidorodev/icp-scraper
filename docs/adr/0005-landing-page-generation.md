# ADR-0005 — Geração de landing pages

**Status:** Aceito · **Data:** 2026-06-29

## Contexto
O diferencial do produto: para cada empresa, gerar automaticamente uma LP personalizada (Hero, Benefícios, Procedimentos, Equipe, Depoimentos, FAQ, Contato, CTA, WhatsApp, Mapa) com identidade visual derivada da empresa, alta performance e SEO, servida em `preview.<dominio>/<slug>` ou subdomínio.

## Decisão
- **Copy** gerada por `ai.generateLandingCopy` → JSON estruturado por seção (validado por zod), específico do nicho. Nunca Lorem Ipsum nem texto genérico.
- **Render**: template engine determinístico em `lp-generator` consome `copy + palette + dados da empresa`. Paleta vem da extração programática em `VisualAnalysis` (não inventada pelo LLM).
- **Tema**: cores/estilo derivados da identidade da empresa; **nenhum ativo protegido copiado** (sem baixar logos/fotos de terceiros como ativos da LP; placeholders na seção Equipe).
- **Deploy**: render estático isolado por slug, servido pelo `apps/web` (`/lp/[slug]`) ou subdomínio wildcard. Performance alta (estático), SEO (meta/OG/schema gerados).

## Alternativas
- **LLM gera HTML completo direto**: imprevisível, inseguro (HTML não confiável), difícil garantir performance/responsividade. Rejeitado — LLM gera só copy estruturada; layout é template controlado.
- **Builder visual (tipo page-builder)**: overkill para geração automática em massa.

## Consequências
+ Saída consistente, responsiva, performática e segura (template controlado).
+ Personalização real (copy por nicho + paleta da empresa) sem violar direitos.
− Variedade visual limitada ao conjunto de templates (mitigável com variantes).
