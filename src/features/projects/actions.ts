"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrors } from "@/features/auth/schemas";
import { getCurrentUser } from "@/features/auth/session";
import { createProjectSchema, updateProjectSchema } from "@/features/projects/schemas";
import type { ActionState } from "@/lib/actions/state";
import { decryptToken } from "@/lib/crypto/token-crypto";
import { commitPluginJson, createUserRepo } from "@/lib/github/repos";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * 社区插件项目相关的 Server Action。
 *
 * 发布流程:校验 → 登录校验 → 读 profiles 拿 GitHub 登录名 →
 * 解密 github_identities 中的令牌 → 查重 → 在用户 GitHub 账号下建仓 →
 * 写入站点数据库 → 失效 site-plugins 缓存 → 跳转详情页。
 */

const NOT_CONFIGURED_ERROR = "站点未配置登录服务,请先完成 Supabase 配置。";
const LINK_REQUIRED_ERROR = "请先关联 GitHub 账号后再发布插件。";
const TOKEN_INVALID_ERROR = "GitHub 授权已失效,请到账号设置重新关联。";
const SLUG_TAKEN_FIELD_ERROR = "该项目标识已被使用,请换一个";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
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

  // 在用户自己的 GitHub 账号下创建公开仓库
  const repoResult = await createUserRepo({
    token,
    name: input.slug,
    description: input.descriptionZh,
    homepage: `${SITE_URL}${detailPath}`,
  });
  if (!repoResult.ok) {
    if (repoResult.code === "name_taken") {
      return { fieldErrors: { slug: "你的 GitHub 账号下已有同名仓库,请换一个项目标识" } };
    }
    if (repoResult.code === "unauthorized") return { error: TOKEN_INVALID_ERROR };
    if (repoResult.code === "rate_limited") {
      return { error: "GitHub 接口限流,请稍后再试。" };
    }
    return { error: repoResult.message };
  }
  const repo = repoResult.repo;

  // 初始化 plugin.json:尽力而为,失败不阻断发布,原因经 query 参数带到详情页
  const commitResult = await commitPluginJson({
    token,
    fullName: repo.fullName,
    branch: repo.defaultBranch,
    pluginJson: {
      pluginId,
      name: { zh: input.nameZh, en: input.nameEn || undefined },
      author: githubLogin,
      category: input.category,
      version: input.version,
      description: { zh: input.descriptionZh, en: input.descriptionEn || undefined },
      tags: input.tags,
    },
  });
  const notice = commitResult.ok
    ? null
    : `仓库已创建,但 plugin.json 初始化失败:${commitResult.message}`;

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
    repo_full_name: repo.fullName,
    repo_url: `https://github.com/${repo.fullName}`,
    repo_branch: repo.defaultBranch,
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

  // RLS 限定只能更新自己的行;select 确认受影响行数
  const { data, error } = await supabase
    .from("plugins")
    .update({
      name_zh: input.nameZh,
      name_en: input.nameEn || null,
      description_zh: input.descriptionZh,
      description_en: input.descriptionEn || null,
      category: input.category,
      tags: input.tags,
      version: input.version,
    })
    .eq("plugin_id", input.pluginId)
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
