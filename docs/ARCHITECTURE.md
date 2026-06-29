# Arquitetura

## 1. Visão geral

O sistema é um **pipeline de enriquecimento e qualificação** disparado por uma _campanha_ (nicho + subnicho + localização + limite). Cada empresa descoberta percorre estágios independentes, idempotentes e paralelizáveis, terminando como um **lead qualificado completo** (score, relatório, oportunidades, ROI, landing page, mensagens, prioridade).

```
                       ┌──────────────────────────────────────────────────────────┐
                       │                     apps/web (Next.js)                     │
                       │  Dashboard · CRM/Kanban · Mapa · LP preview host · API     │
                       └───────────────┬───────────────────────────┬──────────────┘
                                       │ enqueue                    │ read/write
                                       ▼                            ▼
                            ┌─────────────────────┐        ┌─────────────────┐
                            │   Redis (BullMQ)    │        │   PostgreSQL    │
                            │   filas por estágio │        │   (Prisma)      │
                            └──────────┬──────────┘        └────────┬────────┘
                                       │ consume                    │
                                       ▼                            │
                       ┌──────────────────────────────────────────────────────────┐
                       │                   apps/worker (Node)                       │
                       │   orquestra o pipeline por estágio (ver §4)                │
                       └──────────────────────────────────────────────────────────┘
                                       │ usa
        ┌──────────────┬──────────────┼───────────────┬──────────────┬─────────────┐
        ▼              ▼              ▼               ▼              ▼             ▼
   collectors      analyzers       scoring          ai         lp-generator    queue
   (descoberta)   (auditoria)   (ICP engine)   (LLM abstr.)  (template+render) (jobs)
```

## 2. Monorepo

```
icp-prospector/
├─ apps/
│  ├─ web/            # Next.js 15 — dashboard, CRM, API routes, host das LPs
│  └─ worker/         # processo Node — workers BullMQ, orquestração do pipeline
├─ packages/
│  ├─ core/           # tipos de domínio + schemas zod compartilhados (fonte da verdade)
│  ├─ db/             # Prisma client + acesso a dados (repositórios)
│  ├─ config/         # carregamento/validação de env (zod), feature flags
│  ├─ logger/         # pino + correlação por jobId/companyId
│  ├─ queue/          # setup BullMQ, definição de filas, schedulers, rate limits
│  ├─ collectors/     # descoberta + enriquecimento de fontes (interface ICollector)
│  ├─ analyzers/      # auditorias (website, seo, tech, visual, gbp, social)
│  ├─ scoring/        # motor de ICP score (regras + pesos versionados)
│  ├─ ai/             # abstração LLM (claude/openai), prompts, geradores
│  └─ lp-generator/   # geração + render + deploy das landing pages
├─ prisma/
│  └─ schema.prisma
├─ infra/
│  ├─ docker-compose.yml
│  ├─ Dockerfile.web
│  └─ Dockerfile.worker
├─ docs/
└─ turbo.json
```

**Por que assim:** lógica de negócio em `packages/*` puros (sem dependência de Next ou de runtime), testáveis isolados; `apps/*` só compõem. Permite rodar o worker escalado horizontalmente sem subir o front.

## 3. Módulos (responsabilidade única)

### `core`
Tipos de domínio (`Company`, `WebsiteAudit`, `IcpScore`, `Opportunity`…) e **schemas zod** que validam toda fronteira (input de campanha, payload de provider, output de LLM). Nenhum outro pacote redefine esses tipos.

### `collectors` — descoberta (interface `ICollector`)
Cada fonte é um provider que implementa a mesma interface, registrado num **registry**. Liga/desliga por env.
- `places` — Google Places API (Text Search + Place Details). **Fonte primária de descoberta.**
- `website-crawl` — Playwright + Cheerio: navega o site-alvo (somente o próprio site da empresa).
- `cnpj` — consulta dado público (ReceitaWS/BrasilAPI) quando há CNPJ.
- `social-resolve` — resolve handles de IG/FB/LinkedIn a partir do site (não scrapeia o conteúdo deles por padrão; ver ADR-0003).
- `apify` _(opcional, atrás de flag)_ — actors pagos para extras de maps/social, assumindo o risco de ToS no provider terceiro.

Saída normalizada → `CompanyDraft` + `RawSourcePayload` (jsonb, proveniência preservada).

### `analyzers` — auditoria (interface `IAnalyzer`)
- `website` — Lighthouse + PageSpeed Insights API: performance, SEO, acessibilidade, best-practices, Core Web Vitals.
- `tech` — detecção de CMS/framework/analytics/pixel/GTM/Clarity/chat (heurística sobre HTML/headers, estilo Wappalyzer).
- `onpage` — SSL, domínio/idade, meta tags, schema/JSON-LD, OG, favicon, robots, sitemap, 404s, broken links, contagem de páginas, blog, botão WhatsApp/agendamento, formulários.
- `seo` — indexação, headings, keywords, canonical, links internos, CWV.
- `visual` — análise por **LLM de visão** sobre screenshot: qualidade de design, paleta, hierarquia, confiança/premium vs amador, stock vs real, legibilidade, CTA/UX. Extrai paleta dominante (programático, não só LLM).
- `gbp` — métricas do Google Business Profile (reviews, nota, frequência, última avaliação, respostas do dono, fotos, Q&A, serviços, posts).
- `social` — métricas públicas de IG/FB/LinkedIn **quando disponíveis via API/flag** (seguidores, posts, engajamento, última postagem, link da bio).

Cada analyzer é **degradável**: falha de um não derruba o pipeline; grava `status=partial` e segue.

### `scoring` — motor de ICP
Função pura `score(company, audits) → IcpScore` com **pesos versionados** (`scoringVersion`). Pontua **intenção de compra**, não só "precisa de site". Detalhe em [DATA-MODEL §ICP](./DATA-MODEL.md#icp-score) e ADR-0007.

### `ai` — abstração LLM
Interface `ILLMProvider` com implementações `claude` e `openai`, selecionadas por env/task (`LLM_PROVIDER`, override por tarefa). Camadas:
- `prompts/` — templates versionados por tarefa (report, opportunities, proposal, copy, lp, messages, visual).
- `tasks/` — funções de alto nível (`generateReport`, `generateLandingCopy`, `generateOutreach`…) que montam prompt + validam output com zod + fazem retry/repair.
- Custo/latência: `claude-opus-4-8` para LP/copy longa; `claude-sonnet-4-6` (ou equivalente OpenAI) para análise em massa; visão para `visual`.

### `lp-generator`
Recebe `Company + Audits + IcpScore + AI copy + paleta` → produz uma landing page personalizada (Hero, Benefícios, Procedimentos, Equipe c/ placeholders, Depoimentos **rotulados como exemplo**, FAQ, Contato, CTA, WhatsApp, Mapa). Render estático isolado por slug, servido em `preview.<dominio>/<slug>` ou subdomínio wildcard. Sem ativos protegidos — só cores/estilo derivados.

### `queue`
Definição das filas BullMQ por estágio, schedulers, **rate limiting por fonte** (respeitar quota de API), backoff exponencial, dead-letter.

## 4. Pipeline (estágios)

Cada estágio é um job BullMQ, idempotente (chave = `companyId:stage:scoringVersion`), com retry e checkpoint no DB.

```
1. DISCOVER      campanha → lista de CompanyDraft (collectors.places)            [1 job / campanha, paginado]
2. DEDUPE        unifica por (nome+endereço+telefone+domínio), funde fontes      [1 job / campanha]
3. ENRICH        cnpj, social-resolve, gbp básico                                [1 job / empresa]
4. ANALYZE       fan-out: website, tech, onpage, seo, visual, gbp, social        [N sub-jobs / empresa, paralelos]
5. SCORE         scoring.score(...)                                              [1 job / empresa]
6. OPPORTUNITIES ai.generateOpportunities(...)                                   [1 job / empresa]
7. PROPOSAL      ai.generateProposal(...) (resumo, impacto, ROI, prioridades)    [1 job / empresa]
8. LANDING       ai.generateLandingCopy → lp-generator.build → deploy            [1 job / empresa]
9. MESSAGES      ai.generateOutreach (WhatsApp/LinkedIn/Email)                   [1 job / empresa]
10. FINALIZE     consolida prioridade comercial, cria CrmCard                    [1 job / empresa]
```

- **Gating:** estágio N+1 só enfileira quando N grava resultado válido. Estágios 6-9 dependem de 5; podem rodar paralelos entre si.
- **Idempotência:** reprocessar uma empresa (novo `scoringVersion`) não duplica registros — upsert por chave.
- **Observabilidade:** cada job emite progresso (`JobRun`) → dashboard mostra pipeline ao vivo.
- **Backpressure:** concorrência por fila + rate limit por fonte protege quotas de API e custo de LLM.

## 5. Escala (milhares de análises paralelas)

- Workers **stateless**, escaláveis horizontalmente (réplicas Docker/K8s); estado só em Postgres + Redis.
- Fan-out no estágio ANALYZE explora paralelismo por empresa **e** por sub-análise.
- **Cache** (Redis, TTL): PSI/Lighthouse por domínio, geocoding, lookups de CNPJ — evita reprocessar e estoura quota.
- **Custo de LLM**: batching, modelo menor para tarefas em massa, cache de prompts, e _budget guard_ por campanha.
- Rate limit central por fonte (token bucket no Redis) compartilhado entre réplicas.
- DB: índices em `campaignId`, `status`, `icpScore.total`; jsonb para payloads brutos (proveniência sem inflar colunas).

## 6. apps/web

- **Dashboard**: tabela de empresas (filtros, score, prioridade, status), mapa, contadores de pipeline ao vivo.
- **CRM/Kanban**: colunas `Novo → Contato enviado → Respondeu → Reunião → Proposta → Fechado/Perdido`, observações, histórico.
- **Detalhe da empresa**: relatório, oportunidades, ROI, preview da LP, mensagens prontas (copiar/enviar).
- **Host de LP**: rota dinâmica `/lp/[slug]` (ou subdomínio) servindo a página gerada.
- **API**: route handlers (ou tRPC) para CRUD + disparo de campanha (enfileira no BullMQ).

## 7. Segurança & multi-tenant (preparado, não obrigatório no MVP)

- `tenantId` em todas as entidades de negócio → isolamento por agência/cliente.
- Segredos só no worker/server; nunca expor chaves de API ao client.
- Rate-limit e auth nas rotas de API; LPs públicas são read-only e sem dado sensível.
