import { describe, it, expect } from "vitest";
import { classifyLink } from "./classify.js";

describe("classifyLink", () => {
  it("site real → site", () => {
    expect(classifyLink("https://clinicax.com.br").kind).toBe("site");
  });

  it("instagram cadastrado como site → instagram + handle", () => {
    const c = classifyLink("https://www.instagram.com/clinicax/");
    expect(c.kind).toBe("instagram");
    expect(c.handle).toBe("clinicax");
  });

  it("facebook → facebook", () => {
    expect(classifyLink("https://facebook.com/clinicax").kind).toBe("facebook");
  });

  it("linktree → aggregator", () => {
    expect(classifyLink("https://linktr.ee/clinicax").kind).toBe("aggregator");
  });

  it("wa.me → whatsapp", () => {
    expect(classifyLink("https://wa.me/5511999999999").kind).toBe("whatsapp");
  });

  it("vazio → none", () => {
    expect(classifyLink("").kind).toBe("none");
    expect(classifyLink(null).kind).toBe("none");
  });
});
