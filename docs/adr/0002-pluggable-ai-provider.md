# ADR-0002 — Provider de IA pluggable (Claude + OpenAI)

**Status:** Aceito · **Data:** 2026-06-29

## Contexto
O sistema usa LLM em muitas tarefas (relatório, oportunidades, proposta, copy, LP, mensagens, análise visual), com perfis diferentes de custo/latência/qualidade. Lock-in num único provider é risco de custo e disponibilidade.

## Decisão
Interface `ILLMProvider` em `packages/ai` com implementações `claude` e `openai`. Seleção por env `LLM_PROVIDER` + override por task (`MODEL_BULK`, `MODEL_LONGFORM`, `MODEL_VISION`). Toda saída estruturada passa por `completeStructured` (zod + retry/repair).

**Default:** Claude (`claude-opus-4-8` para copy/LP longa, `claude-sonnet-4-6` para análise em massa). OpenAI como alternativa/fallback.

## Alternativas
- **Só Claude**: simples, mas sem fallback nem flexibilidade de custo. Rejeitado (usuário pediu pluggable).
- **LangChain/framework genérico**: abstração pesada demais para o que precisamos; preferimos interface fina própria.

## Consequências
+ Troca de provider por env; A/B de modelo por task; fallback em outage.
+ Saída sempre validada por schema → menos parsing frágil.
− Manter paridade entre dois SDKs (visão, streaming, tool use diferem).
