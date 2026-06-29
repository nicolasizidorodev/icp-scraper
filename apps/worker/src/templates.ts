import { prisma } from "@icp/db";
import { slugify } from "@icp/lp-generator";

/** Resolve o template de LP por nicho: exato → overlap de tokens → undefined (default). */
export async function resolveTemplate(niche: string | null | undefined): Promise<string | undefined> {
  const key = slugify(niche ?? "");
  if (!key) return undefined;

  const exact = await prisma.landingTemplate.findUnique({ where: { niche: key } });
  if (exact) return exact.html;

  const all = await prisma.landingTemplate.findMany({ select: { niche: true, html: true } });
  const tokens = new Set(key.split("-"));
  const hit = all.find((t) => t.niche.split("-").some((tok) => tokens.has(tok)));
  return hit?.html;
}
