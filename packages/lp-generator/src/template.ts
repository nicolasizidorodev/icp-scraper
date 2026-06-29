// Mini-engine de template p/ LP. O template (desenhado pelo Stitch) é HTML cru
// com marcadores; o pipeline injeta os dados. Sem dependências.
//
// Sintaxe:
//   {{KEY}}                              → escalar
//   <!--EACH:NAME-->...{{field}}...<!--END:EACH:NAME-->   → repete por item
//   <!--IF:NAME-->...<!--END:IF:NAME-->  → mantém só se flag verdadeira
//
// Valores DEVEM vir já escapados (o engine só substitui — não escapa).

export interface TemplateCtx {
  scalars?: Record<string, string>;
  flags?: Record<string, boolean>;
  sections?: Record<string, Array<Record<string, string>>>;
}

export function renderTemplate(tpl: string, ctx: TemplateCtx): string {
  let out = tpl;

  // 1) blocos repetidos
  out = out.replace(
    /<!--EACH:(\w+)-->([\s\S]*?)<!--END:EACH:\1-->/g,
    (_full, name: string, inner: string) => {
      const items = ctx.sections?.[name] ?? [];
      // só substitui chaves do item; desconhecidas seguem p/ o passe global
      return items
        .map((item) =>
          inner.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in item ? item[k]! : m)),
        )
        .join("");
    },
  );

  // 2) blocos condicionais
  out = out.replace(
    /<!--IF:(\w+)-->([\s\S]*?)<!--END:IF:\1-->/g,
    (_full, name: string, inner: string) => (ctx.flags?.[name] ? inner : ""),
  );

  // 3) escalares restantes
  out = out.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => ctx.scalars?.[k] ?? "");

  return out;
}
