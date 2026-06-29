import { describe, it, expect } from "vitest";
import { extractJson } from "./json.js";

describe("extractJson", () => {
  it("extrai JSON cru", () => {
    expect(extractJson('{"a":1}')).toBe('{"a":1}');
  });

  it("remove cercas markdown", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("ignora texto antes/depois", () => {
    expect(extractJson('Claro! Aqui: {"a":1} pronto.')).toBe('{"a":1}');
  });

  it("extrai array", () => {
    expect(extractJson("prefixo [1,2,3] sufixo")).toBe("[1,2,3]");
  });
});
