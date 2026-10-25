"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/session";
import { getPluginById } from "@/features/catalog/queries";
import type { ActionState } from "@/lib/actions/state";
import { createClient } from "@/lib/supabase/server";

/**
 * 点赞/收藏/关注相关的 Server Action(开关语义:存在即删除,不存在即插入)。
 *
 * 写操作一律走带会话的 createClient(),RLS 保证:
 * - 只能以自己的身份插入/删除(user_id / follower_id = auth.uid());
 * - user_follows 有 no_self_follow 约束兜底,这里先做业务校验给出中文错误。
 *
 * 成功后 updateTag("social-stats") 让计数缓存立即失效,
 * 页面数据由客户端 router.refresh() 按需刷新;未登录直接跳登录页。
 */

const NOT_CONFIGURED_ERROR = "站点未配置登录服务,请先完成 Supabase 配置。";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** 未登录统一入口:跳转登录页并记录回跳地址 */
function redirectToLogin(nextPath: string): never {
  redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

export async function toggleLikeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const pluginId = formString(formData, "pluginId");
  if (!pluginId) return { error: "找不到该插件。" };

  const user = await getCurrentUser();
  if (!user) {
    redirectToLogin(
      formString(formData, "next") || `/plugins/${encodeURIComponent(pluginId)}`,
    );
  }

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  // 插件必须存在于目录中,防止对已下架/不存在的插件写入点赞
  const plugin = await getPluginById(pluginId);
  if (!plugin) return { error: "插件不存在或已被移除。" };

  const { data: existing } = await supabase
    .from("plugin_likes")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("plugin_id", pluginId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("plugin_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("plugin_id", pluginId);
    if (error) return { error: `取消点赞失败:${error.message}` };
    updateTag("social-stats");
    return { ok: true, liked: false, message: "已取消点赞" };
  }

  const { error } = await supabase
    .from("plugin_likes")
    .insert({ user_id: user.id, plugin_id: pluginId });
  if (error) return { error: `点赞失败:${error.message}` };

  updateTag("social-stats");
  return { ok: true, liked: true, message: "已点赞" };
}

export async function toggleFavoriteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const pluginId = formString(formData, "pluginId");
  if (!pluginId) return { error: "找不到该插件。" };

  const user = await getCurrentUser();
  if (!user) {
    redirectToLogin(
      formString(formData, "next") || `/plugins/${encodeURIComponent(pluginId)}`,
    );
  }

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const plugin = await getPluginById(pluginId);
  if (!plugin) return { error: "插件不存在或已被移除。" };

  const { data: existing } = await supabase
    .from("plugin_favorites")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("plugin_id", pluginId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("plugin_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("plugin_id", pluginId);
    if (error) return { error: `取消收藏失败:${error.message}` };
    updateTag("social-stats");
    return { ok: true, favorited: false, message: "已取消收藏" };
  }

  const { error } = await supabase
    .from("plugin_favorites")
    .insert({ user_id: user.id, plugin_id: pluginId });
  if (error) return { error: `收藏失败:${error.message}` };

  updateTag("social-stats");
  return { ok: true, favorited: true, message: "已收藏" };
}

export async function toggleFollowAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const username = formString(formData, "username").trim();
  if (!username) return { error: "找不到该作者。" };

  const user = await getCurrentUser();
  if (!user) {
    redirectToLogin(
      formString(formData, "next") || `/users/${encodeURIComponent(username)}`,
    );
  }

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  // 目标作者必须真实存在,防止凭空构造 username 写入关注关系
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!target) return { error: "作者不存在。" };
  if (target.id === user.id) return { error: "不能关注自己" };

  const { data: existing } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("followed_id", target.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followed_id", target.id);
    if (error) return { error: `取消关注失败:${error.message}` };
    updateTag("social-stats");
    return { ok: true, following: false, message: "已取消关注" };
  }

  const { error } = await supabase
    .from("user_follows")
    .insert({ follower_id: user.id, followed_id: target.id });
  if (error) return { error: `关注失败:${error.message}` };

  updateTag("social-stats");
  return { ok: true, following: true, message: "已关注" };
}
