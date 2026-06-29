# Plano de execução (faseado)

Cada fase é entregável e testável isolada, implementada contra os contratos em [`docs/MODULE-CONTRACTS.md`](./docs/MODULE-CONTRACTS.md). Ordem pensada para ter **um slice rodando ponta-a-ponta o quanto antes** (F0→F4), depois aprofundar.

## F0 — Fundação
- Monorepo pnpm + Turborepo, tsconfig base, eslint/prettier.
- `packages/core` (tipos + zod), `config` (env via zod), `logger` (pino).
- `packages/db` (Prisma client + migração inicial a partir do schema).
- `infra/docker-compose.yml` (Postgres + Redis), Dockerfiles web/worker.
- **Saída:** `pnpm dev` sobe web vazia + worker idle + DB/Redis no Docker.

## F1 — Fila & pipeline
- `packages/queue` (BullMQ, filas por estágio, rate limiter Redis, backoff, DLQ).
- `apps/worker` esqueleto: registra workers, escreve `JobRun`, gating entre estágios.
- **Saída:** disparar campanha enfileira DISCOVER; pipeline avança com estágios stub.

## F2 — Descoberta (collectors)
- `collectors/places` (Google Places: Text Search + Details), registry, env toggle.
- Estágio DEDUPE (dedupeKey + merge), persistência `Company` + `CompanySource`.
- **Saída:** campanha real retorna lista deduplicada de empresas no DB/dashboard.

## F3 — Análise de site (analyzers núcleo)
- `analyzers/website` (PageSpeed Insights API + Lighthouse), `tech`, `onpage` (Playwright + Cheerio, SÓ site-alvo).
- `analyzers/seo`.
- Cache Redis por domínio.
- **Saída:** cada empresa com site recebe `WebsiteAudit` + `SeoAudit`.

## F4 — Score + IA núcleo + slice ponta-a-ponta
- `packages/scoring` v1 (pesos + breakdown + sub-scores).
- `packages/ai` abstração `ILLMProvider` (claude + openai), `generateReport`, `generateOpportunities`.
- **Saída (MARCO):** nicho/cidade → coleta → análise → score → relatório + oportunidades, visível no detalhe da empresa.

## F5 — Visual + GBP + social
- `analyzers/visual` (screenshot + LLM visão + extração de paleta).
- `analyzers/gbp` (métricas profundas), `analyzers/social` (APIs/flag, sem scraping IG/LI por padrão).
- Recalibrar pesos de scoring com novos sinais.

## F6 — Proposta + Landing page
- `ai.generateProposal` (resumo, impacto, ROI, prioridades).
- `ai.generateLandingCopy` + `lp-generator` (seções, paleta, guardrails ADR-0006).
- Host de LP em `apps/web` (`/lp/[slug]` ou subdomínio wildcard) + deploy.
- **Saída:** cada empresa qualificada sai com proposta + LP publicada.

## F7 — Outreach + CRM
- `ai.generateOutreach` (WhatsApp/LinkedIn/Email personalizados, anti-spam).
- CRM/Kanban completo (`CrmCard`/`CrmEvent`), prioridade derivada do score.
- Dashboard: tabela com filtros, mapa, pipeline ao vivo.

## F8 — Escala & hardening
- Concorrência por fila, budget guard de LLM por campanha, cache agressivo.
- Réplicas de worker, métricas/observabilidade, testes de carga (milhares paralelas).
- Multi-tenant enforcement, auth nas rotas, rate-limit de API, segredos isolados.

---

### Dependências entre fases
```
F0 → F1 → F2 → F3 → F4(marco) → F5 → F6 → F7 → F8
                         └────────→ F6 (proposta só depende de F4 + F5)
```

### Definição de pronto (por fase)
Testes unitários nos pacotes puros (`core`, `scoring`, `ai` tasks com mock de provider), 1 teste de integração do estágio, doc atualizado, sem segredo commitado.
