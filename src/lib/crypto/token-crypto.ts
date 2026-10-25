import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * GitHub OAuth 令牌的静态加密(AES-256-GCM)。
 *
 * 密钥来自环境变量 GITHUB_TOKEN_ENCRYPTION_KEY(64 位 hex,即 32 字节),
 * 只存在于服务端;数据库里落盘的是 `iv:tag:ciphertext` 密文。
 * 密钥未配置时关联流程必须显式失败,绝不允许明文落库。
 */

export function isTokenEncryptionConfigured(): boolean {
  return getKey() !== null;
}

export function encryptToken(plainText: string): string | null {
  const key = getKey();
  if (!key) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptToken(packed: string): string | null {
  const key = getKey();
  if (!key) return null;

  const [ivB64, tagB64, dataB64] = packed.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return null;

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // 密钥轮换或数据损坏时解密失败,调用方按"需重新关联"处理
    return null;
  }
}

function getKey(): Buffer | null {
  const raw = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "hex");
  return key.length === 32 ? key : null;
}
