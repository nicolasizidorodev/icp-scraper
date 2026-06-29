import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { logger } from "@icp/logger";

// AES-256-GCM. Master key vem de APP_ENCRYPTION_KEY (32 bytes em hex ou base64).
// Sem a env, deriva uma chave de DEV (insegura) e avisa — nunca usar em produção.

let warned = false;

function masterKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (raw) {
    const buf = /^[0-9a-fA-F]{64}$/.test(raw)
      ? Buffer.from(raw, "hex")
      : Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
    throw new Error("APP_ENCRYPTION_KEY deve ter 32 bytes (hex de 64 chars ou base64)");
  }
  if (!warned) {
    logger.warn("APP_ENCRYPTION_KEY ausente — usando chave de DEV insegura. NÃO usar em produção.");
    warned = true;
  }
  return scryptSync("icp-dev-insecure", "icp-static-salt", 32);
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(":");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("ciphertext inválido");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
