# ADR-0001 — Monorepo com pnpm + Turborepo

**Status:** Aceito · **Data:** 2026-06-29

## Contexto
Web (Next.js) e worker (Node/BullMQ) compartilham tipos de domínio, acesso a DB e lógica de negócio. Precisam evoluir juntos sem duplicação nem versionamento cruzado de pacotes internos.

## Decisão
Monorepo único: `pnpm workspaces` + `Turborepo`. Lógica de negócio em `packages/*` puros (sem dependência de Next/runtime); `apps/web` e `apps/worker` apenas compõem.

## Alternativas
- **Multi-repo**: overhead de versionar pacotes internos, drift de tipos. Rejeitado.
- **Next.js fullstack só (sem worker separado)**: análises longas/paralelas não cabem em serverless/route handlers; precisa de processo worker dedicado. Rejeitado.

## Consequências
+ Tipos compartilhados via `core`; refactor atômico; cache de build do Turbo.
+ Worker escala horizontal independente do front.
− Setup inicial mais elaborado (tsconfig base, build pipeline).
