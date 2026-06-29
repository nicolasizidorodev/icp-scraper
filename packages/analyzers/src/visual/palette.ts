// Extração de paleta a partir do HTML/CSS inline. Puro (sem decodificar imagem),
// suficiente p/ tematizar a LP. theme-color tem prioridade.

function normHex(h: string): string | null {
  let x = h.replace("#", "").toLowerCase();
  if (x.length === 3) x = x.split("").map((c) => c + c).join("");
  if (x.length !== 6 || /[^0-9a-f]/.test(x)) return null;
  return `#${x}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Luminância relativa simples (0-1) p/ filtrar quase-branco/quase-preto. */
function lum(hex: string): number {
  const x = hex.slice(1);
  const r = parseInt(x.slice(0, 2), 16);
  const g = parseInt(x.slice(2, 4), 16);
  const b = parseInt(x.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Extrai até `n` cores dominantes do HTML. Prioriza theme-color. */
export function extractPalette(html: string, n = 3): string[] {
  const counts = new Map<string, number>();
  const bump = (hex: string | null, weight = 1) => {
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + weight);
  };

  // theme-color (forte sinal de marca)
  const theme = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i);
  if (theme?.[1]) bump(normHex(theme[1]), 10);

  for (const m of html.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) bump(normHex(m[0]));
  for (const m of html.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    bump(rgbToHex(Number(m[1]), Number(m[2]), Number(m[3])));
  }

  const ranked = [...counts.entries()]
    .filter(([hex]) => {
      const l = lum(hex);
      return l > 0.06 && l < 0.96; // descarta quase-preto/branco puro
    })
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);

  return ranked.slice(0, n);
}
