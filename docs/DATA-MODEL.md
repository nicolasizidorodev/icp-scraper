# Modelo de dados

Schema canônico: [`prisma/schema.prisma`](../prisma/schema.prisma). Postgres. Este doc explica o **porquê** e o ciclo de vida.

## Entidades

| Entidade | Papel |
|----------|-------|
| `Tenant` | Agência/cliente. Isolamento multi-tenant em todas as entidades de negócio. |
| `Campaign` | Critérios de busca (nicho, subnicho, cidade, estado, país, limite) + status + contadores de progresso + `scoringVersion`. |
| `Company` | Registro unificado/deduplicado da empresa. Campos núcleo + geo + resumo rápido de GBP. Hub de todas as auditorias. |
| `CompanySource` | Payload **bruto** por fonte (jsonb). Preserva proveniência sem inflar `Company`. |
| `GbpProfile` | Análise profunda do Google Business Profile. |
| `WebsiteAudit` | Lighthouse/PSI + tech detect + onpage + CWV + presença de recursos. |
| `SeoAudit` | SEO on-page/indexação/headings/keywords. |
| `VisualAnalysis` | Análise por LLM de visão + paleta extraída. |
| `SocialProfile` | Métricas públicas por rede (1 linha por rede). |
| `IcpScore` | Score 0-100 + breakdown por critério + sub-scores. Versionado. |
| `Opportunity` | Oportunidade específica (nunca genérica) com severidade + evidência. |
| `Proposal` | Resumo executivo, problemas, impacto, sugestões, ROI, prioridades. |
| `LandingPage` | LP gerada: slug, url, paleta, copy estruturada, html, status. |
| `OutreachMessage` | Mensagem por canal (WhatsApp/LinkedIn/Email). |
| `CrmCard` + `CrmEvent` | Estado de funil + histórico de transições. |
| `JobRun` | Observabilidade do pipeline (estágio, status, tentativa, progresso, erro). |

## Decisões de modelagem

- **`Company` 1:1 com auditorias** (`WebsiteAudit`, `SeoAudit`, `VisualAnalysis`, `GbpProfile`, `IcpScore`, `Proposal`, `LandingPage`, `CrmCard`): cada empresa tem no máximo uma de cada → consulta simples, upsert idempotente.
- **`CompanySource` 1:N**: várias fontes contribuem para a mesma empresa; raw payload guardado para reprocessamento e auditoria.
- **Dedupe** via `dedupeKey` (nome+endereço+telefone+domínio normalizados) + unique `(campaignId, dedupeKey)`. Estágio DEDUPE funde fontes na mesma `Company`.
- **jsonb** (`raw`, `breakdown`, `copy`, `metaTags`, `techStack`) para dado semiestruturado/variável — flexível sem migração a cada campo novo de provider.
- **`AuditStatus` por auditoria**: pipeline degradável; `PARTIAL`/`FAILED` não bloqueiam os demais estágios.
- **Versionamento de scoring** (`scoringVersion`): recalcular score com pesos novos é reprocessamento idempotente, não duplicação.

## ICP Score

`IcpScore.total` (0-100) = soma ponderada de critérios, gravados em `breakdown` (`{criterio: {raw, weight, points}}`) para auditoria/explicabilidade. Dois sub-scores guiam priorização:

- **`buyingIntent`** — probabilidade de COMPRA (negócio consolidado, sinais de investimento em marketing, reputação forte + presença digital fraca = dor sentida e orçamento provável).
- **`reputation`** — qualidade percebida (nota, volume e frequência de reviews, respostas do dono).

Critérios (pesos versionados em `packages/scoring`, ver ADR-0007). Princípio: **priorizar quem provavelmente COMPRA, não quem só "precisa"**. Ex.: clínica com GBP excelente + Instagram ativo + site inexistente/lento pontua alto (dor + orçamento + sinal de investimento); negócio sem nenhuma presença digital pontua baixo (provável baixo orçamento/maturidade).

`CrmCard.priority` deriva do `total` → ordenação comercial no Kanban.

## Ciclo de vida de uma empresa

```
DISCOVERED → DEDUPED → ENRICHED → ANALYZED → SCORED → OPPORTUNITIES
          → PROPOSAL → LANDING → MESSAGES → FINALIZED (CrmCard criado, priority setada)
```

`Company.pipelineStage` espelha o estágio atual; `JobRun` registra cada transição para o dashboard ao vivo.
