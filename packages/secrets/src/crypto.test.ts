import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "./crypto.js";

describe("crypto AES-256-GCM", () => {
  it("roundtrip preserva o valor", () => {
    const secret = "sk-ant-api03-xyz-1234567890";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("ciphertexts diferentes para o mesmo valor (IV aleatório)", () => {
    expect(encrypt("abc")).not.toBe(encrypt("abc"));
  });

  it("rejeita ciphertext adulterado (auth tag)", () => {
    const payload = encrypt("segredo");
    const [iv, tag, data] = payload.split(":");
    const tampered = [iv, tag, Buffer.from("outracoisa").toString("base64")].join(":");
    expect(() => decrypt(tampered)).toThrow();
  });
});
