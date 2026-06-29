import { describe, it, expect } from "vitest";
import { approxTokens, estimateCostUsd } from "./cost.js";

describe("cost", () => {
  it("aproxima tokens por comprimento", () => {
    expect(approxTokens("12345678")).toBe(2);
  });

  it("opus custa mais que haiku p/ mesma carga", () => {
    const opus = estimateCostUsd("claude-opus-4-8", 1000, 1000);
    const haiku = estimateCostUsd("claude-haiku-4-5", 1000, 1000);
    expect(opus).toBeGreaterThan(haiku);
  });

  it("modelo desconhecido usa fallback (custo > 0)", () => {
    expect(estimateCostUsd("modelo-x", 1_000_000, 1_000_000)).toBeGreaterThan(0);
  });

  it("custo escala com tokens", () => {
    const a = estimateCostUsd("gpt-4o", 1000, 1000);
    const b = estimateCostUsd("gpt-4o", 2000, 2000);
    expect(b).toBeCloseTo(a * 2, 6);
  });
});
