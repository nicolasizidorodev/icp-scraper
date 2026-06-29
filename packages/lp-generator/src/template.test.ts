import { describe, it, expect } from "vitest";
import { renderTemplate } from "./template.js";

describe("renderTemplate", () => {
  it("substitui escalares", () => {
    expect(renderTemplate("Olá {{NAME}}!", { scalars: { NAME: "Ana" } })).toBe("Olá Ana!");
  });

  it("repete blocos EACH", () => {
    const tpl = "<!--EACH:ITENS--><li>{{t}}</li><!--END:EACH:ITENS-->";
    const out = renderTemplate(tpl, { sections: { ITENS: [{ t: "a" }, { t: "b" }] } });
    expect(out).toBe("<li>a</li><li>b</li>");
  });

  it("EACH vazio → some", () => {
    const tpl = "x<!--EACH:Z-->{{a}}<!--END:EACH:Z-->y";
    expect(renderTemplate(tpl, { sections: { Z: [] } })).toBe("xy");
  });

  it("IF mantém quando flag verdadeira, remove quando falsa", () => {
    const tpl = "<!--IF:OK-->sim<!--END:IF:OK-->";
    expect(renderTemplate(tpl, { flags: { OK: true } })).toBe("sim");
    expect(renderTemplate(tpl, { flags: { OK: false } })).toBe("");
  });

  it("escalar global aplica dentro de bloco EACH também", () => {
    const tpl = "<!--EACH:X-->{{n}}-{{SUFIXO}}<!--END:EACH:X-->";
    const out = renderTemplate(tpl, { sections: { X: [{ n: "1" }] }, scalars: { SUFIXO: "z" } });
    expect(out).toBe("1-z");
  });

  it("chave ausente vira string vazia", () => {
    expect(renderTemplate("[{{MISSING}}]", {})).toBe("[]");
  });
});
