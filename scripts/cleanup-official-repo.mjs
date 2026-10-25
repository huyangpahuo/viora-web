/**
 * 一次性清理脚本:修复站点误提交到官方仓库 huyangpahuo/Viora-plugins 的内容。
 *
 * 步骤:
 *  1. 用服务端密钥解密作者的 GitHub 令牌(github_identities)
 *  2. 官方仓库 registry.json 移除 huyangpahuo.mimi 条目(恢复 95 个)
 *  3. 删除官方仓库 plugins/huyangpahuo.mimi/plugin.json(文件夹随之消失)
 *  4. 创建(或复用)作者专属仓库 huyangpahuo/viora-plugins-hub
 *  5. 把 mimi 的 plugin.json 与 registry 条目提交到 hub 仓库
 *  6. 更新数据库行指向 hub 仓库
 */
import { createClient } from "@supabase/supabase-js";
import {
  createDecipheriv,
} from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("D:/Viora网站/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ENC_KEY = Buffer.from(env.GITHUB_TOKEN_ENCRYPTION_KEY, "hex");
const GH = "https://api.github.com";

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
  const d = createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(ivB64, "base64"));
  d.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([d.update(Buffer.from(dataB64, "base64")), d.final()]).toString("utf8");
}

const admin = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });

const { data: profile } = await admin.from("profiles").select("id,username").eq("username", "huyangpahuo").single();
if (!profile) throw new Error("找不到作者 profile");
const { data: identity } = await admin.from("github_identities").select("access_token_encrypted").eq("user_id", profile.id).single();
if (!identity) throw new Error("找不到 GitHub 令牌");
const token = decryptToken(identity.access_token_encrypted);
console.log("✔ 令牌解密成功");

const OFFICIAL = "huyangpahuo/Viora-plugins";
const HUB = "huyangpahuo/viora-plugins-hub";

// ---- 1. 官方仓库 registry.json 移除 mimi 条目 ----
const regRes = await fetch(`${GH}/repos/${OFFICIAL}/contents/registry.json?ref=main`, { headers: ghHeaders(token) });
const regJson = await regRes.json();
const registry = JSON.parse(Buffer.from(regJson.content, "base64").toString("utf8"));
const before = registry.presets.length;
registry.presets = registry.presets.filter((p) => p.pluginId !== "huyangpahuo.mimi");
registry.count = registry.presets.length;
console.log(`官方仓库 presets: ${before} -> ${registry.count}`);

const putRes = await fetch(`${GH}/repos/${OFFICIAL}/contents/registry.json`, {
  method: "PUT",
  headers: ghHeaders(token),
  body: JSON.stringify({
    message: "revert: 移除由网站误提交的 huyangpahuo.mimi 条目",
    content: Buffer.from(JSON.stringify(registry, null, 2), "utf8").toString("base64"),
    sha: regJson.sha,
    branch: "main",
  }),
});
console.log("官方 registry.json 还原:", putRes.status === 200 ? "✔" : `✘ ${putRes.status} ${await putRes.text().then(t => t.slice(0, 200))}`);

// ---- 2. 官方仓库删除 plugins/huyangpahuo.mimi/plugin.json(先取回内容给 hub 用) ----
const plugRes = await fetch(`${GH}/repos/${OFFICIAL}/contents/plugins/huyangpahuo.mimi/plugin.json?ref=main`, { headers: ghHeaders(token) });
const plugJson = await plugRes.json();
const pluginFileContent = Buffer.from(plugJson.content, "base64").toString("utf8");
console.log("取回误提交的 plugin.json:", plugRes.status === 200 ? "✔" : `✘ ${plugRes.status}`);

const delRes = await fetch(`${GH}/repos/${OFFICIAL}/contents/plugins/huyangpahuo.mimi/plugin.json`, {
  method: "DELETE",
  headers: ghHeaders(token),
  body: JSON.stringify({
    message: "revert: 移除由网站误提交的 huyangpahuo.mimi 文件",
    sha: plugJson.sha,
    branch: "main",
  }),
});
console.log("官方 plugins/huyangpahuo.mimi 删除:", delRes.status === 200 ? "✔" : `✘ ${delRes.status}`);

// ---- 3. hub 仓库(存在则复用) ----
let hubRes = await fetch(`${GH}/repos/${HUB}`, { headers: ghHeaders(token) });
if (hubRes.status === 404) {
  const createRes = await fetch(`${GH}/user/repos`, {
    method: "POST",
    headers: ghHeaders(token),
    body: JSON.stringify({
      name: "viora-plugins-hub",
      description: "该作者在 Viora Plugins 发布的全部插件",
      homepage: "http://localhost:3000",
      private: false,
      auto_init: true,
      has_wiki: false,
    }),
  });
  console.log("创建 hub 仓库:", createRes.status === 201 ? "✔" : `✘ ${createRes.status}`);
} else {
  console.log("hub 仓库已存在:", hubRes.status);
}

// ---- 4. mimi 的 plugin.json 提交到 hub ----
const hubPlugPut = await fetch(`${GH}/repos/${HUB}/contents/plugins/huyangpahuo.mimi/plugin.json`, {
  method: "PUT",
  headers: ghHeaders(token),
  body: JSON.stringify({
    message: "chore: 由 Viora Plugins 网站同步 huyangpahuo.mimi 元数据",
    content: Buffer.from(pluginFileContent, "utf8").toString("base64"),
    branch: "main",
  }),
});
console.log("hub plugin.json 提交:", hubPlugPut.status === 201 ? "✔" : `✘ ${hubPlugPut.status} ${await hubPlugPut.text().then(t => t.slice(0, 200))}`);

// ---- 5. hub 的 registry.json 追加 mimi 条目(以数据库行为准) ----
const { data: mimiRow } = await admin.from("plugins").select("*").eq("plugin_id", "huyangpahuo.mimi").single();
if (!mimiRow) throw new Error("数据库中找不到 huyangpahuo.mimi");

const hubRegRes = await fetch(`${GH}/repos/${HUB}/contents/registry.json?ref=main`, { headers: ghHeaders(token) });
let hubRegistry, hubRegSha;
if (hubRegRes.status === 200) {
  const j = await hubRegRes.json();
  hubRegistry = JSON.parse(Buffer.from(j.content, "base64").toString("utf8"));
  hubRegSha = j.sha;
} else {
  hubRegistry = { version: 1, updated: new Date().toISOString().slice(0, 10), count: 0, presets: [] };
}
const entry = {
  pluginId: mimiRow.plugin_id,
  name: { zh: mimiRow.name_zh, ...(mimiRow.name_en ? { en: mimiRow.name_en } : {}) },
  author: profile.username,
  category: mimiRow.category,
  version: mimiRow.version,
  package: mimiRow.package_path ?? `packages/${mimiRow.plugin_id}.zip`,
  description: { zh: mimiRow.description_zh, ...(mimiRow.description_en ? { en: mimiRow.description_en } : {}) },
  ...(mimiRow.tags?.length ? { tags: mimiRow.tags } : {}),
};
hubRegistry.presets = (hubRegistry.presets ?? []).filter((p) => p.pluginId !== entry.pluginId);
hubRegistry.presets.push(entry);
hubRegistry.count = hubRegistry.presets.length;
hubRegistry.updated = new Date().toISOString().slice(0, 10);

const hubRegPut = await fetch(`${GH}/repos/${HUB}/contents/registry.json`, {
  method: "PUT",
  headers: ghHeaders(token),
  body: JSON.stringify({
    message: "chore: 由 Viora Plugins 网站更新 registry.json",
    content: Buffer.from(JSON.stringify(hubRegistry, null, 2), "utf8").toString("base64"),
    ...(hubRegSha ? { sha: hubRegSha } : {}),
    branch: "main",
  }),
});
console.log("hub registry.json 更新:", hubRegPut.status === 200 ? "✔" : `✘ ${hubRegPut.status}`);

// ---- 6. 数据库行指向 hub ----
const { error: updErr } = await admin
  .from("plugins")
  .update({
    repo_full_name: HUB,
    repo_url: `https://github.com/${HUB}`,
    package_path: `packages/${mimiRow.plugin_id}.zip`,
  })
  .eq("plugin_id", "huyangpahuo.mimi");
console.log("数据库行迁移到 hub:", updErr ? `✘ ${updErr.message}` : "✔");

// ---- 7. 终验:官方 registry 不含 mimi,内容长度还原 ----
const verify = await fetch(`${GH}/repos/${OFFICIAL}/contents/registry.json?ref=main`, { headers: ghHeaders(token) });
const v = JSON.parse(Buffer.from((await verify.json()).content, "base64").toString("utf8"));
console.log("终验: 官方 presets =", v.presets.length, "| 含 mimi =", v.presets.some(p => p.pluginId === "huyangpahuo.mimi"));
