# ADR-0007 — Motor de ICP scoring

**Status:** Aceito · **Data:** 2026-06-29

## Contexto
O objetivo não é volume de leads, mas **probabilidade de COMPRA**. Um modelo ingênuo ("não tem site → alvo") prioriza errado: negócio sem nenhuma presença digital costuma ter baixo orçamento/maturidade. Queremos quem **sente a dor E tem dinheiro/intenção** de resolver.

## Decisão
Função **pura e versionada** `score(input) → IcpScoreResult` em `packages/scoring`. Pesos em config versionada (`scoringVersion`), breakdown gravado para explicabilidade. Dois sub-scores guiam a priorização:

- **`buyingIntent`** (probabilidade de comprar): negócio consolidado (anos de atuação, volume de reviews), **sinais de investimento em marketing** (Instagram ativo, posts no GBP, pixel/GA presentes em parte), e a **lacuna** entre reputação forte e presença digital fraca (dor sentida + orçamento provável).
- **`reputation`** (qualidade percebida): nota, volume e frequência de reviews, taxa de resposta do dono.

### Critérios (pesos iniciais v1, recalibráveis)
| Critério | Sinal | Direção |
|---|---|---|
| GBP ativo + bem avaliado | rating, reviewCount, frequência | ↑ buyingIntent + reputation |
| Instagram ativo | followers, postCount, lastPost recente | ↑ buyingIntent (investe em mkt) |
| Empresa consolidada | yearsActive, reviewCount alto | ↑ buyingIntent |
| Site inexistente / antigo / lento | exists, domainAge, perfScore, LCP | ↑ oportunidade (mas só pontua alto se houver sinal de investimento) |
| Ausência de SEO / CTA / WhatsApp / pixel / analytics | flags do WebsiteAudit | ↑ oportunidade |
| Boa identidade visual (IG/site) | VisualAnalysis premiumScore | ↑ buyingIntent (cuida da marca) |
| Sinais de gasto com mkt | pixel/GTM/ads detectados | ↑ buyingIntent |

**Regra de ouro:** "precisa de site" sozinho NÃO pontua alto. O peso maior é a **combinação** dor + reputação + sinais de investimento.

## Alternativas
- **Modelo ML treinado**: sem dados rotulados de conversão ainda; começar com regras explicáveis e versionadas, evoluir para ML quando houver histórico de fechamento (`CrmCard` WON/LOST = labels futuros).
- **Score único sem breakdown**: opaco, difícil calibrar. Rejeitado.

## Consequências
+ Explicável (breakdown por critério) e calibrável (versão de pesos).
+ Prioriza intenção de compra, não só necessidade.
+ `CrmCard` WON/LOST acumula labels → caminho para ML supervisionado depois.
− Pesos iniciais são hipótese; exigem recalibração com dados reais de conversão.
