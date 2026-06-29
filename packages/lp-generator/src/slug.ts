/** Slug URL-safe a partir de texto livre (sem acentos). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Slug único de LP = nome + sufixo curto do id. */
export function landingSlug(name: string, id: string): string {
  const base = slugify(name) || "empresa";
  return `${base}-${id.slice(-6)}`;
}
