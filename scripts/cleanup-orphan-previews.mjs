/**
 * 一次性清理:hub 仓库 previews/ 下已无对应插件记录的孤儿目录。
 * 逐个文件删除(GitHub contents API 不支持整目录删除),目录随之消失。
 */
import { createClient } from "@supabase/supabase-js";
import { createDecipheriv } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("D:/Viora网站/.env.local", "utf8")
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => [
      line.slice(0, line.indexOf("=")).trim(),
      line.slice(line.indexOf("=") + 1).trim(),
    ]),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function ghHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json",
    "x-github-api-version": "2022-11-28",
  };
}

function decryptToken(packed) {
  const [ivB64, tagB64, dataB64] = packed.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(env.GITHUB_TOKEN_ENCRYPTION_KEY, "hex"),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

const { data: profile } = await admin
  .from("profiles")
  .select("id,username")
  .eq("username", "huyangpahuo")
  .single();
if (!profile) throw new Error("找不到作者 profile");

const { data: identity } = await admin
  .from("github_identities")
  .select("access_token_encrypted")
  .eq("user_id", profile.id)
  .single();
if (!identity) throw new Error("找不到 GitHub 令牌");
const token = decryptToken(identity.access_token_encrypted);
console.log("✔ 令牌解密成功");

const HUB = "huyangpahuo/viora-plugins-hub";
const GH = "https://api.github.com";

// 数据库中现存插件(含已隐藏)
const { data: liveRows } = await admin
  .from("plugins")
  .select("plugin_id")
  .eq("owner_id", profile.id);
const liveIds = new Set((liveRows ?? []).map((row) => row.plugin_id));
console.log("数据库现存插件:", [...liveIds].join(", ") || "(无)");

// hub 仓库 previews/ 下的目录
const dirRes = await fetch(`${GH}/repos/${HUB}/contents/previews?ref=main`, {
  headers: ghHeaders(token),
});
if (dirRes.status === 404) {
  console.log("previews/ 目录不存在,无需清理");
  process.exit(0);
}
const dirs = (await dirRes.json()).filter((entry) => entry.type === "dir");
console.log("仓库中的 previews 目录:", dirs.map((d) => d.name).join(", ") || "(无)");

for (const dir of dirs) {
  if (liveIds.has(dir.name)) {
    console.log(`保留 previews/${dir.name}(插件仍存在)`);
    continue;
  }
  console.log(`清理孤儿目录 previews/${dir.name}:`);
  const filesRes = await fetch(
    `${GH}/repos/${HUB}/contents/previews/${dir.name}?ref=main`,
    { headers: ghHeaders(token) },
  );
  const files = (await filesRes.json()).filter((entry) => entry.type === "file");
  for (const file of files) {
    const res = await fetch(`${GH}/repos/${HUB}/contents/${file.path}`, {
      method: "DELETE",
      headers: ghHeaders(token),
      body: JSON.stringify({
        message: "chore: 由 Viora Plugins 网站清理已删除插件的预览图",
        sha: file.sha,
        branch: "main",
      }),
    });
    console.log(`  ${file.path}: ${res.status === 200 ? "✔" : "✘ " + res.status}`);
  }
}
console.log("完成");
