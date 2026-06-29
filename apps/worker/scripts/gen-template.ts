/**
 * Gera um template de landing page por NICHO via Claude (designer) e salva no DB.
 * O pipeline passa a usar esse template p/ empresas do nicho, injetando
 * copy/paleta/logo de cada empresa.
 *
 * Uso:
 *   pnpm gen:template "clínica odontológica"
 *   pnpm gen:template "restaurante" "elegante, tons quentes, fotos grandes"
 *
 * Requer ANTHROPIC_API_KEY (ou OPENAI_API_KEY + LLM_PROVIDER=openai) no .env/UI.
 * Para um design feito no Stitch, use scripts/import-template.ts (source=stitch).
 */
import { prisma } from "@icp/db";
import { generateLandingTemplate } from "@icp/ai";
import { validateTemplate, slugify } from "@icp/lp-generator";

async function main(): Promise<void> {
  const niche = process.argv[2];
  const style = process.argv[3];
  if (!niche) {
    console.error('uso: pnpm gen:template "<nicho>" ["<estilo opcional>"]');
    process.exit(1);
  }

  console.log(`[gen-template] gerando design p/ "${niche}"${style ? ` (${style})` : ""}…`);
  let html = await generateLandingTemplate({ niche, style });
  let check = validateTemplate(html);

  if (!check.ok) {
    console.log(`[gen-template] faltam marcadores: ${check.missing.join(", ")} — 1 retry`);
    html = await generateLandingTemplate({ niche, style, feedback: `inclua os marcadores ausentes: ${check.missing.join(", ")}` });
    check = validateTemplate(html);
  }
  if (!check.ok) {
    console.error(`[gen-template] FALHA: template inválido (faltam ${check.missing.join(", ")})`);
    process.exit(1);
  }

  const key = slugify(niche);
  await prisma.landingTemplate.upsert({
    where: { niche: key },
    create: { niche: key, label: niche, html, source: "claude" },
    update: { label: niche, html, source: "claude" },
  });

  console.log(`[gen-template] OK — salvo (niche=${key}, ${html.length} bytes). Pipeline já usa.`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[gen-template] erro:", err);
  process.exit(1);
});
