"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrors } from "@/features/auth/schemas";
import { getCurrentUser } from "@/features/auth/session";
import { createProjectSchema, updateProjectSchema } from "@/features/projects/schemas";
import type { ActionState } from "@/lib/actions/state";
import { decryptToken } from "@/lib/crypto/token-crypto";
import { uploadPackageToRepo, validatePackageFile } from "@/lib/github/package";
import { uploadPreviewToRepo, validatePreviewFile } from "@/lib/github/previews";
import {
  AUTHOR_REPO_SUFFIX,
  commitTextFile,
  createUserRepo,
  deleteFile,
  getJsonFile,
  getRepo,
} from "@/lib/github/repos";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { CommunityPluginRow } from "@/features/catalog/database-types";

/**
 * 社区插件项目相关的 Server Action。
 *
 * 发布流程:校验 → 登录校验 → 读 profiles 拿 GitHub 登录名 →
 * 解密 github_identities 中的令牌 → 查重 → 确保作者的专属单仓库
 * `<githubLogin>/viora-plugins-hub` 存在 → 预览图提交进仓库 →
 * 写入 plugin.json 与 registry.json → 写入站点数据库 →
 * 失效 site-plugins 缓存 → 跳转详情页。
 *
 * 编辑流程:数据库更新成功后,尽力而为把最新内容同步回作者仓库
 * (plugin.json 与 registry.json 条目),失败只提示、不阻断保存。
 *
 * 删除流程:真删除站点记录,再尽力清理仓库中的 plugin.json、
 * registry 条目与安装包 zip;仓库本身与已上传的预览图保留。
 */

const NOT_CONFIGURED_ERROR = "站点未配置登录服务,请先完成 Supabase 配置。";
const LINK_REQUIRED_ERROR = "请先关联 GitHub 账号后再发布插件。";
const TOKEN_INVALID_ERROR = "GitHub 授权已失效,请到账号设置重新关联。";
const SLUG_TAKEN_FIELD_ERROR = "该项目标识已被使用,请换一个";

const NOT_FOUND_ERROR = "找不到该项目或没有权限";

/** 每位作者只占用一个仓库(名称见 AUTHOR_REPO_SUFFIX),所有插件都登记在这里 */
const PLUGIN_REPO_DESCRIPTION = "该作者在 Viora Plugins 发布的全部插件";
const REGISTRY_PATH = "registry.json";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * 表单里的文件字段:未选择文件时浏览器会提交一个 name 为空串的 File,
 * 视为"没选"返回 null;"选了但内容为空"的文件保留下来,
 * 由 validatePreviewFile 给出更明确的提示。
 */
function formFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.name !== "" ? value : null;
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

/**
 * 从 pluginId(<githubLogin>.<slug>)还原作者的 GitHub 登录名。
 * GitHub 登录名不含 ".",据此拆分是稳定的,且不随用户后来换绑账号而变。
 */
function authorFromPluginId(pluginId: string): string | null {
  const dot = pluginId.indexOf(".");
  return dot > 0 ? pluginId.slice(0, dot) : null;
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

/** 校验表单里的预览图文件;required 时缺失文件也算错误,返回字段级错误 */
function collectPreviewFieldErrors(
  previewBefore: File | null,
  previewAfter: File | null,
  required = false,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (previewBefore) {
    const message = validatePreviewFile(previewBefore);
    if (message) errors.previewBefore = message;
  } else if (required) {
    errors.previewBefore = "请上传转换前效果图";
  }
  if (previewAfter) {
    const message = validatePreviewFile(previewAfter);
    if (message) errors.previewAfter = message;
  } else if (required) {
    errors.previewAfter = "请上传转换后效果图";
  }
  return errors;
}

/** 校验表单里的 zip 安装包(可选字段,缺失不报错),返回字段级错误 */
function collectPackageFieldErrors(packageZip: File | null): Record<string, string> {
  if (!packageZip) return {};
  const message = validatePackageFile(packageZip);
  return message ? { packageZip: message } : {};
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

/** 构建 plugin.json 与 registry 条目共用的字段集合(以站点数据库数据为准) */
type PluginContentFields = {
  pluginId: string;
  author: string;
  nameZh: string;
  nameEn: string | null;
  descriptionZh: string;
  descriptionEn: string | null;
  category: string;
  version: string;
  tags: string[];
};

/** plugin.json 内容 */
function buildPluginJson(fields: PluginContentFields): string {
  const pluginJson = {
    pluginId: fields.pluginId,
    name: {
      zh: fields.nameZh,
      ...(fields.nameEn ? { en: fields.nameEn } : {}),
    },
    author: fields.author,
    category: fields.category,
    version: fields.version,
    description: {
      zh: fields.descriptionZh,
      ...(fields.descriptionEn ? { en: fields.descriptionEn } : {}),
    },
    tags: fields.tags,
  };
  return `${JSON.stringify(pluginJson, null, 2)}\n`;
}

/** registry.json 中的条目(与发布时的字段结构一致) */
function buildRegistryPreset(fields: PluginContentFields): Record<string, unknown> {
  return {
    pluginId: fields.pluginId,
    name: {
      zh: fields.nameZh,
      ...(fields.nameEn ? { en: fields.nameEn } : {}),
    },
    author: fields.author,
    category: fields.category,
    version: fields.version,
    package: `packages/${fields.pluginId}.zip`,
    description: {
      zh: fields.descriptionZh,
      ...(fields.descriptionEn ? { en: fields.descriptionEn } : {}),
    },
    tags: fields.tags,
  };
}

/**
 * 把插件条目写入仓库的 registry.json:已存在同 pluginId 条目则替换,
 * 否则追加,并同步 count 与 updated。registry.json 缺失或损坏时重建。
 */
async function upsertRegistryPreset(options: {
  token: string;
  fullName: string;
  branch: string;
  preset: Record<string, unknown>;
  pluginId: string;
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

/**
 * 把 plugin.json 与 registry.json 条目同步到作者仓库;尽力而为,
 * 全部成功返回 null,任一失败返回拼接好的中文原因。
 */
async function syncPluginFiles(options: {
  token: string;
  fullName: string;
  branch: string;
  fields: PluginContentFields;
}): Promise<string | null> {
  const pluginJsonCommit = await commitTextFile({
    token: options.token,
    fullName: options.fullName,
    branch: options.branch,
    path: `plugins/${options.fields.pluginId}/plugin.json`,
    content: buildPluginJson(options.fields),
  });

  const registryResult = await upsertRegistryPreset({
    token: options.token,
    fullName: options.fullName,
    branch: options.branch,
    pluginId: options.fields.pluginId,
    preset: buildRegistryPreset(options.fields),
  });

  const notices: string[] = [];
  if (!pluginJsonCommit.ok) {
    notices.push(`plugin.json 同步失败:${pluginJsonCommit.message}`);
  }
  if (!registryResult.ok) {
    notices.push(`registry.json 同步失败:${registryResult.message}`);
  }
  return notices.length > 0 ? notices.join(";") : null;
}

/** 确保作者的专属仓库存在,返回 fullName 与默认分支 */
async function ensurePluginRepo(
  token: string,
  githubLogin: string,
): Promise<
  | { ok: true; fullName: string; branch: string; created: boolean }
  | { ok: false; state: ActionState }
> {
  const fullName = `${githubLogin}/${AUTHOR_REPO_SUFFIX}`;
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
    name: AUTHOR_REPO_SUFFIX,
    description: PLUGIN_REPO_DESCRIPTION,
    homepage: SITE_URL,
  });
  if (!created.ok) {
    // getRepo 返回 404 与创建之间存在并发窗口:仓库其实已存在,重查一次。
    // 若 422 是大小写不同的仓库占用了名称(getRepo 已按名称校验返回 null),
    // 重查仍为 null,会把创建接口的撞名提示原样带给用户。
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

/** repo_full_name 是否指向作者的专属 hub 仓库(大小写不敏感) */
function isAuthorHubRepo(repoFullName: string): boolean {
  return repoFullName.toLowerCase().endsWith(`/${AUTHOR_REPO_SUFFIX}`);
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

  // 预览图必填;先做轻量校验(类型/大小),把错误尽早还给表单
  const previewBefore = formFile(formData, "previewBefore");
  const previewAfter = formFile(formData, "previewAfter");
  const previewFieldErrors = collectPreviewFieldErrors(previewBefore, previewAfter, true);
  if (Object.keys(previewFieldErrors).length > 0) {
    return { fieldErrors: previewFieldErrors };
  }

  // 安装包 zip 可选;未上传时 package_path 留空,下载按钮回退到源码压缩包
  const packageZip = formFile(formData, "packageZip");
  const packageFieldErrors = collectPackageFieldErrors(packageZip);
  if (Object.keys(packageFieldErrors).length > 0) {
    return { fieldErrors: packageFieldErrors };
  }

  // 确保作者的专属仓库存在(每位作者只占用 <githubLogin>/viora-plugins-hub)
  const repoResult = await ensurePluginRepo(token, githubLogin);
  if (!repoResult.ok) return repoResult.state;
  const { fullName: repoFullName, branch: repoBranch } = repoResult;

  // 预览图提交到作者的 hub 仓库(替代 Supabase Storage);
  // 失败则中止发布,GitHub 侧操作幂等,可直接重试
  let previewBeforeUrl: string | null = null;
  let previewAfterUrl: string | null = null;
  try {
    if (previewBefore) {
      previewBeforeUrl = await uploadPreviewToRepo({
        file: previewBefore,
        token,
        hubFullName: repoFullName,
        branch: repoBranch,
        pluginId,
        kind: "before",
      });
    }
    if (previewAfter) {
      previewAfterUrl = await uploadPreviewToRepo({
        file: previewAfter,
        token,
        hubFullName: repoFullName,
        branch: repoBranch,
        pluginId,
        kind: "after",
      });
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "预览图上传失败,请稍后重试。",
    };
  }

  // 安装包 zip(可选)提交到 hub 仓库 packages/<pluginId>.zip;失败中止发布,可重试
  let packagePath: string | null = null;
  if (packageZip) {
    try {
      packagePath = await uploadPackageToRepo({
        file: packageZip,
        token,
        fullName: repoFullName,
        branch: repoBranch,
        pluginId,
      });
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "安装包上传失败,请稍后重试。",
      };
    }
  }

  const fields: PluginContentFields = {
    pluginId,
    author: githubLogin,
    nameZh: input.nameZh,
    nameEn: input.nameEn || null,
    descriptionZh: input.descriptionZh,
    descriptionEn: input.descriptionEn || null,
    category: input.category,
    version: input.version,
    tags: input.tags,
  };

  // 提交 plugin.json 与 registry.json;尽力而为,失败原因经 ?notice= 带到详情页
  const syncNotice = await syncPluginFiles({
    token,
    fullName: repoFullName,
    branch: repoBranch,
    fields,
  });

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
    preview_before_url: previewBeforeUrl,
    preview_after_url: previewAfterUrl,
    package_path: packagePath,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return { fieldErrors: { slug: SLUG_TAKEN_FIELD_ERROR } };
    }
    return { error: `发布失败:${insertError.message}` };
  }

  // 让插件目录(含 site 来源)立即读到新数据
  updateTag("site-plugins");

  redirect(syncNotice ? `${detailPath}?notice=${encodeURIComponent(syncNotice)}` : detailPath);
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

  const githubLogin = await getGithubLogin(supabase, user.id);

  // 表单携带的是数据库行 id;取整行拿到 plugin_id / 仓库信息并确认所有权
  const { data: row, error: rowError } = await supabase
    .from("plugins")
    .select("*")
    .eq("id", input.pluginId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (rowError) return { error: `更新失败:${rowError.message}` };
  if (!row) {
    return { error: NOT_FOUND_ERROR };
  }

  // 可选替换预览图 / 安装包:带了新文件才上传并更新对应字段
  const previewBefore = formFile(formData, "previewBefore");
  const previewAfter = formFile(formData, "previewAfter");
  const previewFieldErrors = collectPreviewFieldErrors(previewBefore, previewAfter);
  if (Object.keys(previewFieldErrors).length > 0) {
    return { fieldErrors: previewFieldErrors };
  }
  const packageZip = formFile(formData, "packageZip");
  const packageFieldErrors = collectPackageFieldErrors(packageZip);
  if (Object.keys(packageFieldErrors).length > 0) {
    return { fieldErrors: packageFieldErrors };
  }

  let githubToken: string | null = null;
  let newBeforeUrl: string | null = null;
  let newAfterUrl: string | null = null;
  let newPackagePath: string | null = null;
  if (previewBefore || previewAfter || packageZip) {
    // 上传新文件需要仓库信息与令牌;失败中止保存,避免"以为换了文件其实没换"
    if (!row.repo_full_name || !row.repo_branch) {
      return { error: "文件上传失败:该项目缺少仓库信息,无法保存新文件。" };
    }
    const tokenResult = await getDecryptedGithubToken(user.id);
    if (!tokenResult.ok) return { error: tokenResult.reason };
    githubToken = tokenResult.token;
    try {
      if (previewBefore) {
        newBeforeUrl = await uploadPreviewToRepo({
          file: previewBefore,
          token: githubToken,
          hubFullName: row.repo_full_name,
          branch: row.repo_branch,
          pluginId: row.plugin_id,
          kind: "before",
        });
      }
      if (previewAfter) {
        newAfterUrl = await uploadPreviewToRepo({
          file: previewAfter,
          token: githubToken,
          hubFullName: row.repo_full_name,
          branch: row.repo_branch,
          pluginId: row.plugin_id,
          kind: "after",
        });
      }
      if (packageZip) {
        newPackagePath = await uploadPackageToRepo({
          file: packageZip,
          token: githubToken,
          fullName: row.repo_full_name,
          branch: row.repo_branch,
          pluginId: row.plugin_id,
        });
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "文件上传失败,请稍后重试。",
      };
    }
  }

  const updates: Partial<CommunityPluginRow> = {
    name_zh: input.nameZh,
    name_en: input.nameEn || null,
    description_zh: input.descriptionZh,
    description_en: input.descriptionEn || null,
    category: input.category,
    tags: input.tags,
    version: input.version,
  };
  if (newBeforeUrl) updates.preview_before_url = newBeforeUrl;
  if (newAfterUrl) updates.preview_after_url = newAfterUrl;
  if (newPackagePath) updates.package_path = newPackagePath;

  // RLS 限定只能更新自己的行;select 整行,同步 GitHub 时以最新数据为准
  const { data, error } = await supabase
    .from("plugins")
    .update(updates)
    .eq("id", row.id)
    .eq("owner_id", user.id)
    .select("*");

  if (error) return { error: `更新失败:${error.message}` };
  const updated = data?.[0];
  if (!updated) {
    return { error: NOT_FOUND_ERROR };
  }

  // 数据库更新成功后,尽力而为同步作者仓库(pluginId/slug 不可变,路径不变);
  // repo_full_name 直接取自该行,旧的 per-plugin 仓库同样走 plugins/ 路径,
  // 缺仓库信息时静默跳过,任何失败都不阻断保存结果
  let syncNotice: string | null = null;
  if (row.repo_full_name && row.repo_branch) {
    if (!githubToken) {
      const tokenResult = await getDecryptedGithubToken(user.id);
      if (tokenResult.ok) githubToken = tokenResult.token;
    }
    if (githubToken) {
      syncNotice = await syncPluginFiles({
        token: githubToken,
        fullName: row.repo_full_name,
        branch: row.repo_branch,
        fields: {
          pluginId: updated.plugin_id,
          author: authorFromPluginId(updated.plugin_id) ?? githubLogin ?? updated.plugin_id,
          nameZh: updated.name_zh,
          nameEn: updated.name_en,
          descriptionZh: updated.description_zh ?? "",
          descriptionEn: updated.description_en,
          category: updated.category,
          version: updated.version,
          tags: updated.tags ?? [],
        },
      });
    } else {
      syncNotice = TOKEN_INVALID_ERROR;
    }
  }

  updateTag("site-plugins");
  return {
    ok: true,
    message: syncNotice ? `已保存,但同步 GitHub 内容失败:${syncNotice}` : "项目已更新。",
  };
}

/**
 * 真删除项目:先删站点记录(RLS 限定只能删自己的行),
 * 再尽力清理作者 hub 仓库中的 plugin.json、registry 条目与安装包 zip。
 * GitHub 侧任何失败都不影响删除结果,只拼进返回的 message 提示;
 * 仓库本身与已上传的预览图不会被删除。
 */
export async function deleteProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rowId = formString(formData, "pluginId");
  if (!rowId) return { error: NOT_FOUND_ERROR };
  const confirmName = formString(formData, "confirm").trim();

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  // 先取整行:确认所有权,并保留清理 GitHub 内容所需的字段(RLS delete 也会兜底)
  const { data: row, error: rowError } = await supabase
    .from("plugins")
    .select("*")
    .eq("id", rowId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (rowError) return { error: `删除失败:${rowError.message}` };
  if (!row) return { error: NOT_FOUND_ERROR };

  // 输入插件名确认,防止误删
  if (confirmName !== row.name_zh) {
    return { fieldErrors: { confirm: "输入的插件名称不一致,请核对后再试" } };
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("plugins")
    .delete()
    .eq("id", row.id)
    .eq("owner_id", user.id)
    .select("id");

  if (deleteError) return { error: `删除失败:${deleteError.message}` };
  if (!deleted || deleted.length === 0) {
    return { error: NOT_FOUND_ERROR };
  }

  // 尽力而为清理 GitHub 内容;失败不影响删除结果
  let cleanupNotice: string | null = null;
  if (row.repo_branch && isAuthorHubRepo(row.repo_full_name)) {
    const tokenResult = await getDecryptedGithubToken(user.id);
    if (!tokenResult.ok) {
      cleanupNotice = tokenResult.reason;
    } else {
      const notices: string[] = [];
      const token = tokenResult.token;

      // 移除 plugins/<pluginId>/plugin.json(预览图作为历史留档保留)
      const pluginJsonPath = `plugins/${row.plugin_id}/plugin.json`;
      const removed = await deleteFile({
        token,
        fullName: row.repo_full_name,
        branch: row.repo_branch,
        path: pluginJsonPath,
      });
      if (!removed.ok) {
        notices.push(`${pluginJsonPath} 清理失败:${removed.message}`);
      }

      // 移除通过网页上传的安装包 zip(package_path 为空说明从未上传,跳过)
      if (row.package_path) {
        const removedZip = await deleteFile({
          token,
          fullName: row.repo_full_name,
          branch: row.repo_branch,
          path: row.package_path,
        });
        if (!removedZip.ok) {
          notices.push(`${row.package_path} 清理失败:${removedZip.message}`);
        }
      }

      // 从 registry.json 中移除该条目(条目本就不存在时不提交)
      const registry = await getJsonFile({
        token,
        fullName: row.repo_full_name,
        branch: row.repo_branch,
        path: REGISTRY_PATH,
      });
      if (!registry.ok) {
        notices.push(`registry.json 清理失败:${registry.message}`);
      } else if (registry.file) {
        const doc = parseRegistryDoc(registry.file.content);
        if (doc) {
          const presets = doc.presets.filter(
            (entry) => !(isRecord(entry) && entry.pluginId === row.plugin_id),
          );
          if (presets.length !== doc.presets.length) {
            const committed = await commitTextFile({
              token,
              fullName: row.repo_full_name,
              branch: row.repo_branch,
              path: REGISTRY_PATH,
              content: `${JSON.stringify(
                { ...doc, updated: today(), count: presets.length, presets },
                null,
                2,
              )}\n`,
              existingSha: registry.file.sha,
            });
            if (!committed.ok) {
              notices.push(`registry.json 清理失败:${committed.message}`);
            }
          }
        }
      }

      if (notices.length > 0) cleanupNotice = notices.join(";");
    }
  }

  updateTag("site-plugins");
  return {
    ok: true,
    message: cleanupNotice
      ? `已删除,但同步清理 GitHub 内容失败:${cleanupNotice}`
      : "项目已删除。",
  };
}

export async function toggleProjectStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const pluginId = formString(formData, "pluginId");
  const status = formString(formData, "status");
  if (!pluginId) return { error: NOT_FOUND_ERROR };
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
    return { error: NOT_FOUND_ERROR };
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
