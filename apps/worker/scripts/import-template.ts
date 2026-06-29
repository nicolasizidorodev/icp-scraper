/**
 * Importa um template de LP feito FORA do app (ex.: desenhado no Stitch e
 * convertido p/ os marcadores) e salva no DB por nicho.
 *
 * Uso:
 *   pnpm import:template "clínica odontológica" ./caminho/template.html [source]
 *
 * O HTML precisa conter os marcadores obrigatórios ({{HERO_HEADLINE}}, EACH:BENEFITS, …);
 * é validado antes de salvar. source default = "stitch".
 */
import { readFileSync } from "node:fs";
import { prisma } from "@icp/db";
import { validateTemplate, slugify } from "@icp/lp-generator";

async function main(): Promise<void> {
  const niche = process.argv[2];
  const file = process.argv[3];
  const source = process.argv[4] ?? "stitch";
  if (!niche || !file) {
    console.error('uso: pnpm import:template "<nicho>" <arquivo.html> [source]');
    process.exit(1);
  }

  const html = readFileSync(file, "utf8");
  const check = validateTemplate(html);
  if (!check.ok) {
    console.error(`[import-template] inválido — faltam marcadores: ${check.missing.join(", ")}`);
    process.exit(1);
  }

  const key = slugify(niche);
  await prisma.landingTemplate.upsert({
    where: { niche: key },
    create: { niche: key, label: niche, html, source },
    update: { label: niche, html, source },
  });

  console.log(`[import-template] OK — niche=${key} source=${source} (${html.length} bytes).`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[import-template] erro:", err);
  process.exit(1);
});
