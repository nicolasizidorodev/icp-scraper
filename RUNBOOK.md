# RUNBOOK — rodar o ICP Prospector ao vivo

Guia de subida local: infra → schema → smoke test offline → execução real.
Nada aqui foi executado ainda nesta máquina (faltava Docker/Redis/Postgres).

## 0. Pré-requisitos

- **Docker Desktop** (Postgres + Redis sobem via compose)
- **Node 20+** e **pnpm 9** (`npm i -g pnpm@9.12.0` — NÃO use o shim do corepack nem pnpm 11)
- Opcional p/ execução real: chaves Google Places, PageSpeed, Anthropic/OpenAI

## 1. Dependências + build

```bash
pnpm install
pnpm db:generate     # gera o Prisma Client (schema em prisma/schema.prisma)
pnpm build           # turbo: todos os packages + web + worker
pnpm test            # 46 testes — sanity check
```

## 2. Variáveis de ambiente

```bash
cp .env.example .env
# gere a chave de criptografia das API keys e cole em APP_ENCRYPTION_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Mínimo p/ o smoke offline: `DATABASE_URL`, `REDIS_URL`, `APP_ENCRYPTION_KEY`.
Os defaults de `.env.example` já batem com o `infra/docker-compose.yml`
(`postgresql://icp:icp_local@localhost:5432/icp_prospector`, `redis://localhost:6379`).

## 3. Infra + schema

```bash
pnpm infra:up        # sobe postgres + redis (healthchecks no compose)
pnpm db:push         # aplica o schema sem histórico de migration (rápido p/ smoke)
# alternativa "prod-like": pnpm db:migrate  (prisma migrate dev --name init)
```

## 4. Smoke test OFFLINE (sem chaves) — recomendado primeiro

Exercita o pipeline inteiro sem nenhuma API externa: `DEMO_PIPELINE=true` faz o
estágio DISCOVER criar 1 empresa-demo, e todos os estágios de IA caem no
**fallback determinístico por regra**.

**Terminal A** — worker com a flag:
```bash
DEMO_PIPELINE=true pnpm --filter @icp/worker dev
```

**Terminal B** — dispara + valida:
```bash
pnpm smoke
```

Esperado: o script cria uma campanha, aguarda a empresa chegar em `FINALIZE` e
imprime ✓ para IcpScore, Opportunity, Proposal, LandingPage+html, OutreachMessage,
CrmCard, além da URL da landing page. Sai `0` se tudo verde.

Veja a LP gerada:
```bash
pnpm --filter @icp/web dev      # Terminal C
# abra http://localhost:3000/lp/<slug>  (slug impresso pelo smoke)
```

## 5. Execução REAL (com fontes + IA)

1. Suba web + worker (sem a flag de demo):
   ```bash
   pnpm --filter @icp/web dev          # http://localhost:3000
   pnpm --filter @icp/worker dev
   ```
2. Em `http://localhost:3000/settings`, insira as chaves (ficam criptografadas no
   banco, têm prioridade sobre o `.env`):
   - `GOOGLE_PLACES_API_KEY` (descoberta — obrigatória p/ achar empresas reais)
   - `PAGESPEED_API_KEY` (Lighthouse/CWV — opcional, eleva a cota)
   - `ANTHROPIC_API_KEY` **ou** `OPENAI_API_KEY` (IA — define `LLM_PROVIDER` no `.env`)
3. Em `/` crie uma campanha (nicho/cidade/UF/máx. empresas). O pipeline dispara.
4. Acompanhe em `/campaigns/<id>` (empresas rankeadas por ICP; clique p/ ver
   diagnóstico, proposta, mensagens, LP) e mova no funil em `/crm`.

> Guard de custo: `LLM_BUDGET_USD_PER_CAMPAIGN` limita o gasto de IA por campanha;
> ao estourar, os estágios usam o fallback por regra. `0` = sem limite.
> Auth de escrita: se setar `ADMIN_TOKEN`, as rotas POST/PUT exigem
> `Authorization: Bearer <token>`.

## 6. Teardown

```bash
pnpm infra:down          # para os containers (mantém volumes)
# apagar dados: docker compose -f infra/docker-compose.yml down -v
```

## Troubleshooting

- **`prisma generate` falha chamando `pnpm add`** → confirme Prisma **5.22.0**
  (não 6.x) e `@prisma/client` na raiz; rode `pnpm db:generate` do root.
- **pnpm rejeita libs recém-publicadas** → você está no pnpm 11
  (`minimumReleaseAge`). Use pnpm 9 standalone.
- **smoke não acha empresa** → worker não está no ar OU faltou `DEMO_PIPELINE=true`.
- **portas 5432/6379 ocupadas** → pare instâncias locais de Postgres/Redis ou
  remapeie as portas no `infra/docker-compose.yml`.
- **LP 404 em `/lp/<slug>`** → a empresa ainda não passou pelo estágio LANDING;
  confira o estágio em `/campaigns/<id>`.
