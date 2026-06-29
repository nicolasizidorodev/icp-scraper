import { describe, it, expect } from "vitest";
import { extractPalette } from "./palette.js";
import { detectSocial } from "../social/detect.js";

describe("extractPalette", () => {
  it("prioriza theme-color", () => {
    const html = `<meta name="theme-color" content="#1e88e5">
      <style>.a{color:#abcabc}.b{color:#abcabc}</style>`;
    expect(extractPalette(html)[0]).toBe("#1e88e5");
  });

  it("converte rgb() para hex", () => {
    expect(extractPalette('<div style="background:rgb(255,0,0)"></div>')).toContain("#ff0000");
  });

  it("descarta branco/preto puros", () => {
    const p = extractPalette("<style>.a{color:#ffffff;background:#000000;border:#2563eb}</style>");
    expect(p).toContain("#2563eb");
    expect(p).not.toContain("#ffffff");
    expect(p).not.toContain("#000000");
  });

  it("expande hex de 3 dígitos", () => {
    expect(extractPalette('<div style="color:#0a3"></div>')).toContain("#00aa33");
  });
});

describe("detectSocial", () => {
  it("extrai instagram e facebook do HTML", () => {
    const html = `<a href="https://instagram.com/clinicax">IG</a>
      <a href="https://www.facebook.com/clinicax">FB</a>`;
    const hits = detectSocial(html);
    const nets = hits.map((h) => h.network);
    expect(nets).toContain("instagram");
    expect(nets).toContain("facebook");
    expect(hits.find((h) => h.network === "instagram")?.handle).toBe("clinicax");
  });

  it("ignora links de share genéricos", () => {
    const hits = detectSocial('<a href="https://facebook.com/sharer/sharer.php">share</a>');
    expect(hits.find((h) => h.network === "facebook")).toBeUndefined();
  });

  it("usa campos conhecidos da empresa como fallback", () => {
    const hits = detectSocial("<p>nada</p>", { instagram: "https://instagram.com/x" });
    expect(hits).toHaveLength(1);
  });
});
