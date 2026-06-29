// Contrato de marcadores que todo template de LP precisa conter p/ o pipeline
// conseguir preencher. Usado p/ validar designs gerados por Claude/Stitch.
export const REQUIRED_MARKERS = [
  "{{TITLE}}",
  "{{C1}}",
  "{{C2}}",
  "{{C3}}",
  "{{HERO_HEADLINE}}",
  "{{HERO_SUB}}",
  "{{CTA_LABEL}}",
  "{{CTA_HREF}}",
  "{{COMPANY_NAME}}",
  "EACH:BENEFITS",
] as const;

export interface TemplateValidation {
  ok: boolean;
  missing: string[];
}

/** Verifica se um HTML tem todos os marcadores obrigatórios. */
export function validateTemplate(html: string): TemplateValidation {
  const missing = REQUIRED_MARKERS.filter((m) => !html.includes(m));
  return { ok: missing.length === 0, missing };
}
