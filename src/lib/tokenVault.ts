import crypto from "crypto";

function encryptionKey() {
  const secret = String(process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || "").trim();
  if (secret.length < 32) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY must be configured with at least 32 characters.");
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

export function encryptToken(value: string | null | undefined) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptToken(value: string | null | undefined) {
  if (!value) return "";
  const [version, ivB64, tagB64, ciphertextB64] = String(value).split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error("Encrypted provider token is malformed.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
