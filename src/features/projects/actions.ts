"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrors } from "@/features/auth/schemas";
import { getCurrentUser } from "@/features/auth/session";
import { createProjectSchema, updateProjectSchema } from "@/features/projects/schemas";
import type { ActionState } from "@/lib/actions/state";
import { decryptToken } from "@/lib/crypto/token-crypto";
import {
  commitTextFile,
  createUserRepo,
  getJsonFile,
  getRepo,
} from "@/lib/github/repos";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/supabase/config";
import {
  uploadPreviewImage,
  validatePreviewFile,
} from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/server";
import type { CommunityPluginRow } from "@/features/catalog/database-types";

/**
 * 社区插件项目相关的 Server Action。
 *
 * 发布流程:校验 → 登录校验 → 读 profiles 拿 GitHub 登录名 →
 * 解密 github_identities 中的令牌 → 查重 → 确保作者的单仓库
 * `<githubLogin>/viora-plugins` 存在 → 写入 plugin.json 与 registry.json →
 * (可选)上传转换前/后预览图 → 写入站点数据库 →
 * 失效 site-plugins 缓存 → 跳转详情页。
 */

const NOT_CONFIGURED_ERROR = "站点未配置登录服务,请先完成 Supabase 配置。";
const LINK_REQUIRED_ERROR = "请先关联 GitHub 账号后再发布插件。";
const TOKEN_INVALID_ERROR = "GitHub 授权已失效,请到账号设置重新关联。";
const SLUG_TAKEN_FIELD_ERROR = "该项目标识已被使用,请换一个";

/** 每位作者只占用一个仓库,所有插件都登记在这里 */
const PLUGIN_REPO_NAME = "viora-plugins";
const PLUGIN_REPO_DESCRIPTION = "该作者在 Viora Plugins 发布的全部插件";
const REGISTRY_PATH = "registry.json";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** 表单里的可选文件字段:未选择文件时浏览器会提交空的 File,视为缺失 */
function formFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function formTags(formData: FormData): string[] {
  return formData.getAll("tags").filter((value): value is string => typeof value === "string");
}

/** 读取当前用户自己 profile 里的 GitHub 登录名 */
async function getGithubLogin(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("github_login")
    .eq("id", userId)
    .maybeSingle();
  return data?.github_login ?? null;
}

/** 用 service role 客户端取出并解密当前用户关联的 GitHub 令牌 */
async function getDecryptedGithubToken(
  userId: string,
): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, reason: TOKEN_INVALID_ERROR };
  }

  const { data: identity, error } = await admin
    .from("github_identities")
    .select("access_token_encrypted")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !identity?.access_token_encrypted) {
    return { ok: false, reason: TOKEN_INVALID_ERROR };
  }

  const token = decryptToken(identity.access_token_encrypted);
  if (!token) {
    return { ok: false, reason: TOKEN_INVALID_ERROR };
  }

  return { ok: true, token };
}

/** 校验表单里的预览图文件,返回字段级错误(没有文件视为合法) */
function collectPreviewFieldErrors(
  previewBefore: File | null,
  previewAfter: File | null,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (previewBefore) {
    const message = validatePreviewFile(previewBefore);
    if (message) errors.previewBefore = message;
  }
  if (previewAfter) {
    const message = validatePreviewFile(previewAfter);
    if (message) errors.previewAfter = message;
  }
  return errors;
}

type PreviewUploadOutcome = {
  beforeUrl: string | null;
  afterUrl: string | null;
  error?: string;
};

/** 上传预览图(有文件才上传);失败直接中止发布,重试流程是幂等的 */
async function uploadPreviews(
  previewBefore: File | null,
  previewAfter: File | null,
  userId: string,
  pluginId: string,
): Promise<PreviewUploadOutcome> {
  let beforeUrl: string | null = null;
  let afterUrl: string | null = null;

  if (previewBefore) {
    const result = await uploadPreviewImage(previewBefore, userId, pluginId, "before");
    if (!result.ok) return { beforeUrl, afterUrl, error: result.message };
    beforeUrl = result.url;
  }
  if (previewAfter) {
    const result = await uploadPreviewImage(previewAfter, userId, pluginId, "after");
    if (!result.ok) return { beforeUrl, afterUrl, error: result.message };
    afterUrl = result.url;
  }

  return { beforeUrl, afterUrl };
}

type RegistryDoc = {
  version: number;
  updated: string;
  count: number;
  presets: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRegistryDoc(raw: string): RegistryDoc | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.presets)) return null;
    return {
      version: typeof parsed.version === "number" ? parsed.version : 1,
      updated: typeof parsed.updated === "string" ? parsed.updated : "",
      count: typeof parsed.count === "number" ? parsed.count : 0,
      presets: parsed.presets,
    };
  } catch {
    return null;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 把插件条目写入作者仓库的 registry.json:已存在同 pluginId 条目则替换,
 * 否则追加,并同步 count 与 updated。registry.json 缺失或损坏时重建。
 */
async function upsertRegistryPreset(options: {
  token: string;
  fullName: string;
  branch: string;
  preset: Record<string, unknown>;
  pluginId: string;
  githubLogin: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const fetched = await getJsonFile({
    token: options.token,
    fullName: options.fullName,
    branch: options.branch,
    path: REGISTRY_PATH,
  });
  if (!fetched.ok) return { ok: false, message: fetched.message };

  const existing = fetched.file ? parseRegistryDoc(fetched.file.content) : null;
  const presets = existing
    ? existing.presets.filter(
        (entry) => !(isRecord(entry) && entry.pluginId === options.pluginId),
      )
    : [];
  presets.push(options.preset);

  const doc: RegistryDoc = {
    version: existing?.version ?? 1,
    updated: today(),
    count: presets.length,
    presets,
  };
  const content = `${JSON.stringify(doc, null, 2)}\n`;

  const committed = await commitTextFile({
    token: options.token,
    fullName: options.fullName,
    branch: options.branch,
    path: REGISTRY_PATH,
    content,
    existingSha: fetched.file?.sha,
  });
  if (!committed.ok) return { ok: false, message: committed.message };
  return { ok: true };
}

/** 确保作者的单仓库存在,返回 fullName 与默认分支 */
async function ensurePluginRepo(
  token: string,
  githubLogin: string,
): Promise<
  | { ok: true; fullName: string; branch: string; created: boolean }
  | { ok: false; state: ActionState }
> {
  const fullName = `${githubLogin}/${PLUGIN_REPO_NAME}`;
  const existing = await getRepo(token, fullName);
  if (!existing.ok) {
    if (existing.code === "unauthorized") {
      return { ok: false, state: { error: TOKEN_INVALID_ERROR } };
    }
    return { ok: false, state: { error: existing.message } };
  }
  if (existing.repo) {
    return { ok: true, fullName: existing.repo.fullName, branch: existing.repo.defaultBranch, created: false };
  }

  const created = await createUserRepo({
    token,
    name: PLUGIN_REPO_NAME,
    description: PLUGIN_REPO_DESCRIPTION,
    homepage: SITE_URL,
  });
  if (!created.ok) {
    // getRepo 返回 404 与创建之间存在并发窗口:仓库其实已存在,重查一次
    if (created.code === "name_taken") {
      const retry = await getRepo(token, fullName);
      if (retry.ok && retry.repo) {
        return {
          ok: true,
          fullName: retry.repo.fullName,
          branch: retry.repo.defaultBranch,
          created: false,
        };
      }
    }
    if (created.code === "unauthorized") {
      return { ok: false, state: { error: TOKEN_INVALID_ERROR } };
    }
    if (created.code === "rate_limited") {
      return { ok: false, state: { error: "GitHub 接口限流,请稍后再试。" } };
    }
    return { ok: false, state: { error: created.message } };
  }
  return {
    ok: true,
    fullName: created.repo.fullName,
    branch: created.repo.defaultBranch,
    created: true,
  };
}

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createProjectSchema.safeParse({
    nameZh: formString(formData, "nameZh"),
    nameEn: formString(formData, "nameEn"),
    slug: formString(formData, "slug"),
    descriptionZh: formString(formData, "descriptionZh"),
    descriptionEn: formString(formData, "descriptionEn"),
    category: formString(formData, "category"),
    tags: formTags(formData),
    version: formString(formData, "version"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  const githubLogin = await getGithubLogin(supabase, user.id);
  if (!githubLogin) {
    // message: "link" 是给前端识别的标记,用于展示关联引导
    return { error: LINK_REQUIRED_ERROR, message: "link" };
  }

  const tokenResult = await getDecryptedGithubToken(user.id);
  if (!tokenResult.ok) return { error: tokenResult.reason };
  const token = tokenResult.token;

  const pluginId = `${githubLogin}.${input.slug}`;
  const detailPath = `/plugins/${encodeURIComponent(pluginId)}`;

  // plugin_id 先行查重;写入时的 23505 兜底(并发窗口)
  const { data: existing } = await supabase
    .from("plugins")
    .select("plugin_id")
    .eq("plugin_id", pluginId)
    .maybeSingle();
  if (existing) {
    return { fieldErrors: { slug: SLUG_TAKEN_FIELD_ERROR } };
  }

  // 预览图先做轻量校验(类型/大小),把错误尽早还给表单
  const previewBefore = formFile(formData, "previewBefore");
  const previewAfter = formFile(formData, "previewAfter");
  const previewFieldErrors = collectPreviewFieldErrors(previewBefore, previewAfter);
  if (Object.keys(previewFieldErrors).length > 0) {
    return { fieldErrors: previewFieldErrors };
  }

  // 确保作者的单仓库存在(每位作者只占用 <githubLogin>/viora-plugins)
  const repoResult = await ensurePluginRepo(token, githubLogin);
  if (!repoResult.ok) return repoResult.state;
  const { fullName: repoFullName, branch: repoBranch } = repoResult;

  // 预览图上传失败则中止发布;GitHub 侧操作幂等,可直接重试
  const previews = await uploadPreviews(previewBefore, previewAfter, user.id, pluginId);
  if (previews.error) return { error: previews.error };

  const pluginJson = {
    pluginId,
    name: { zh: input.nameZh, en: input.nameEn || undefined },
    author: githubLogin,
    category: input.category,
    version: input.version,
    description: { zh: input.descriptionZh, en: input.descriptionEn || undefined },
    tags: input.tags,
  };

  // 提交 plugins/<pluginId>/plugin.json;尽力而为,失败不阻断发布
  const pluginJsonCommit = await commitTextFile({
    token,
    fullName: repoFullName,
    branch: repoBranch,
    path: `plugins/${pluginId}/plugin.json`,
    content: `${JSON.stringify(pluginJson, null, 2)}\n`,
  });

  // 更新 registry.json;同样尽力而为,失败原因经 ?notice= 带到详情页
  const registryResult = await upsertRegistryPreset({
    token,
    fullName: repoFullName,
    branch: repoBranch,
    pluginId,
    githubLogin,
    preset: {
      pluginId,
      name: { zh: input.nameZh, ...(input.nameEn ? { en: input.nameEn } : {}) },
      author: githubLogin,
      category: input.category,
      version: input.version,
      package: `packages/${pluginId}.zip`,
      description: {
        zh: input.descriptionZh,
        ...(input.descriptionEn ? { en: input.descriptionEn } : {}),
      },
      tags: input.tags,
    },
  });

  const notices: string[] = [];
  if (!pluginJsonCommit.ok) {
    notices.push(`plugin.json 初始化失败:${pluginJsonCommit.message}`);
  }
  if (!registryResult.ok) {
    notices.push(`registry.json 更新失败:${registryResult.message}`);
  }
  const notice = notices.length > 0 ? notices.join(";") : null;

  // 写入站点数据库(status 省略,走数据库默认 published)
  const { error: insertError } = await supabase.from("plugins").insert({
    plugin_id: pluginId,
    owner_id: user.id,
    name_zh: input.nameZh,
    name_en: input.nameEn || null,
    description_zh: input.descriptionZh,
    description_en: input.descriptionEn || null,
    category: input.category,
    tags: input.tags,
    version: input.version,
    repo_full_name: repoFullName,
    repo_url: `https://github.com/${repoFullName}`,
    repo_branch: repoBranch,
    preview_before_url: previews.beforeUrl,
    preview_after_url: previews.afterUrl,
    package_path: `packages/${pluginId}.zip`,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return { fieldErrors: { slug: SLUG_TAKEN_FIELD_ERROR } };
    }
    return { error: `发布失败:${insertError.message}` };
  }

  // 让插件目录(含 site 来源)立即读到新数据
  updateTag("site-plugins");

  redirect(notice ? `${detailPath}?notice=${encodeURIComponent(notice)}` : detailPath);
}

export async function updateProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateProjectSchema.safeParse({
    pluginId: formString(formData, "pluginId"),
    nameZh: formString(formData, "nameZh"),
    nameEn: formString(formData, "nameEn"),
    descriptionZh: formString(formData, "descriptionZh"),
    descriptionEn: formString(formData, "descriptionEn"),
    category: formString(formData, "category"),
    tags: formTags(formData),
    version: formString(formData, "version"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  // 表单携带的是数据库行 id;先取出行拿到 plugin_id(上传路径要用)并确认所有权
  const { data: row, error: rowError } = await supabase
    .from("plugins")
    .select("id, plugin_id")
    .eq("id", input.pluginId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (rowError) return { error: `更新失败:${rowError.message}` };
  if (!row) {
    return { error: "找不到该项目或没有权限" };
  }

  // 可选替换预览图:不带文件就不改动现有 URL
  const previewBefore = formFile(formData, "previewBefore");
  const previewAfter = formFile(formData, "previewAfter");
  const previewFieldErrors = collectPreviewFieldErrors(previewBefore, previewAfter);
  if (Object.keys(previewFieldErrors).length > 0) {
    return { fieldErrors: previewFieldErrors };
  }
  const previews = await uploadPreviews(previewBefore, previewAfter, user.id, row.plugin_id);
  if (previews.error) return { error: previews.error };

  const updates: Partial<CommunityPluginRow> = {
    name_zh: input.nameZh,
    name_en: input.nameEn || null,
    description_zh: input.descriptionZh,
    description_en: input.descriptionEn || null,
    category: input.category,
    tags: input.tags,
    version: input.version,
  };
  if (previews.beforeUrl) updates.preview_before_url = previews.beforeUrl;
  if (previews.afterUrl) updates.preview_after_url = previews.afterUrl;

  // RLS 限定只能更新自己的行;select 确认受影响行数
  const { data, error } = await supabase
    .from("plugins")
    .update(updates)
    .eq("id", row.id)
    .eq("owner_id", user.id)
    .select("plugin_id");

  if (error) return { error: `更新失败:${error.message}` };
  if (!data || data.length === 0) {
    return { error: "找不到该项目或没有权限" };
  }

  updateTag("site-plugins");
  return { ok: true, message: "项目已更新。" };
}

export async function toggleProjectStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const pluginId = formString(formData, "pluginId");
  const status = formString(formData, "status");
  if (!pluginId) return { error: "找不到该项目或没有权限" };
  if (status !== "published" && status !== "hidden") {
    return { error: "状态参数无效" };
  }

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  const { data, error } = await supabase
    .from("plugins")
    .update({ status })
    .eq("plugin_id", pluginId)
    .eq("owner_id", user.id)
    .select("plugin_id");

  if (error) return { error: `状态更新失败:${error.message}` };
  if (!data || data.length === 0) {
    return { error: "找不到该项目或没有权限" };
  }

  updateTag("site-plugins");
  return { ok: true };
}

export async function unlinkGithubAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  // 令牌表对客户端全部拒绝,必须走 service role 删除
  const admin = createAdminClient();
  if (!admin) {
    return { error: "站点未配置 GitHub 关联服务,请先完成服务端配置。" };
  }

  const { error: deleteError } = await admin
    .from("github_identities")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) {
    return { error: `解除关联失败:${deleteError.message}` };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ github_login: null, github_avatar_url: null })
    .eq("id", user.id);
  if (profileError) {
    return { error: `解除关联失败:${profileError.message}` };
  }

  return { ok: true, message: "已解除 GitHub 关联;若需要重新创建仓库,请重新关联。" };
}
