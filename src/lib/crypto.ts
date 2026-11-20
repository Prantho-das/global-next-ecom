import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { getEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_VERSION = "v1";

function getKeyBuffer(): Buffer {
  return Buffer.from(getEnv().ENCRYPTION_KEY, "hex");
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKeyBuffer(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    KEY_VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted payload format");
  }
  const [version, ivB64, tagB64, dataB64] = parts;
  if (
    version !== KEY_VERSION ||
    ivB64 === undefined ||
    tagB64 === undefined ||
    dataB64 === undefined
  ) {
    throw new Error("Unsupported encrypted payload version");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    getKeyBuffer(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
