# ADR-0004 — Orquestração do pipeline (BullMQ + estágios idempotentes)

**Status:** Aceito · **Data:** 2026-06-29

## Contexto
Análise por empresa é longa (PSI, Lighthouse, múltiplas chamadas de LLM) e o sistema deve rodar **milhares em paralelo**. Falhas parciais (uma fonte/analyzer cai) não podem derrubar o lote. Precisa de retry, rate limit por fonte e progresso observável.

## Decisão
Pipeline em **estágios discretos** (DISCOVER→DEDUPE→ENRICH→ANALYZE→SCORE→OPPORTUNITIES→PROPOSAL→LANDING→MESSAGES→FINALIZE), cada um uma fila **BullMQ** sobre Redis.
- **Idempotência:** chave `companyId:stage:scoringVersion`; upsert, não insert.
- **Gating:** estágio N+1 só enfileira após N gravar resultado válido; 6-9 paralelos entre si após 5.
- **Fan-out** no ANALYZE: sub-jobs por analyzer, paralelos.
- **Degradável:** analyzer falho grava `status=FAILED` sem propagar exceção.
- **Rate limit** central por fonte (token bucket no Redis, compartilhado entre réplicas) + backoff exponencial + dead-letter queue.
- **Observabilidade:** cada job escreve `JobRun` → dashboard ao vivo.

## Alternativas
- **Orquestrador serverless (Step Functions/Temporal)**: poderoso, mas mais infra/lock-in para o estágio atual. Temporal é candidato futuro se a complexidade crescer.
- **Cron + tabela de fila própria**: reinventa BullMQ pior. Rejeitado.

## Consequências
+ Escala horizontal por réplica de worker; retry/backoff prontos; progresso ao vivo.
+ Reprocessar empresa = mudar `scoringVersion`, sem duplicar.
− Estado distribuído (Redis+Postgres) exige cuidado de consistência (checkpoint no DB).
