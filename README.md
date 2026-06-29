# ICP Prospector

Sistema de prospecção B2B orientado a **ICP (Ideal Customer Profile)** que vai além de coletar leads: descobre empresas, faz **análise técnica/visual profunda**, calcula um **score de probabilidade de compra**, detecta **oportunidades reais**, gera **proposta + landing page personalizada** e **mensagens de outreach** — tudo automatizado, preparado para milhares de análises paralelas.

> **Status deste repositório:** _Architecture & Plan pass_. Contém somente documentação de arquitetura, modelo de dados (Prisma), ADRs e o plano de execução faseado. Nenhum código de aplicação foi gerado ainda — esse é o próximo passo, fase por fase (ver [`PLAN.md`](./PLAN.md)).

## Decisões já tomadas

| Tema | Decisão | ADR |
|------|---------|-----|
| Monorepo | pnpm workspaces + Turborepo | [ADR-0001](./docs/adr/0001-monorepo-turborepo.md) |
| AI | Provider **pluggable** (Claude + OpenAI), troca por env/task | [ADR-0002](./docs/adr/0002-pluggable-ai-provider.md) |
| Fontes de dados | **Híbrido**: APIs oficiais para descoberta (Google Places) + Playwright só no site-alvo. Sem scraping de IG/LinkedIn por padrão | [ADR-0003](./docs/adr/0003-hybrid-source-strategy.md) |
| Orquestração | BullMQ + Redis, pipeline em estágios idempotentes | [ADR-0004](./docs/adr/0004-pipeline-orchestration.md) |
| Landing pages | Template engine + render isolado por tenant, deploy preview | [ADR-0005](./docs/adr/0005-landing-page-generation.md) |
| Legal/ética | Sem clonar ativos protegidos; depoimentos fictícios SEMPRE rotulados; coleta só de dado público/API | [ADR-0006](./docs/adr/0006-legal-ethics-guardrails.md) |

## Documentos

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — visão de sistema, módulos, fluxo de pipeline, escala.
- [`docs/DATA-MODEL.md`](./docs/DATA-MODEL.md) — entidades, relações, ciclo de vida.
- [`docs/MODULE-CONTRACTS.md`](./docs/MODULE-CONTRACTS.md) — interfaces TypeScript de cada módulo (collector/analyzer/ai/lp).
- [`prisma/schema.prisma`](./prisma/schema.prisma) — schema completo.
- [`docs/adr/`](./docs/adr/) — Architecture Decision Records.
- [`PLAN.md`](./PLAN.md) — roadmap faseado (F0→F8).
- [`.env.example`](./.env.example) — variáveis necessárias.

## Quickstart (F0)

```bash
pnpm install                 # workspaces
pnpm infra:up                # Postgres + Redis (Docker)
cp .env.example .env         # preencher segredos
pnpm exec prisma generate    # gera o client (rodar do ROOT)
pnpm db:migrate              # cria as tabelas
pnpm dev                     # web (:3000) + worker idle
```

> **Notas de ambiente (Windows):**
> - Prisma pinado em **5.22.0**. O 6.19 roda um `pnpm add @prisma/client --silent` automático no `generate` que falha sob pnpm no Windows; 5.22 não tem esse wrapper.
> - `@prisma/client` está como dependência **na raiz** (não só em `packages/db`) para o Prisma resolvê-lo a partir da pasta do schema. Rodar `prisma generate` **do root**.
> - pnpm **9.x standalone** (não o shim do corepack): pnpm 11 aplica `minimumReleaseAge` e rejeita libs publicadas nas últimas 24h.

## Stack alvo

Next.js 15 (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL · Redis · BullMQ · Playwright · Cheerio · Lighthouse / PageSpeed Insights API · Google Places API · Claude + OpenAI SDK · Docker.
