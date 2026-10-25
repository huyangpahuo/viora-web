"use server";

import { fieldErrors } from "@/features/auth/schemas";
import { getCurrentUser } from "@/features/auth/session";
import { getPluginById } from "@/features/catalog/queries";
import { createCommentSchema } from "@/features/comments/schemas";
import type { ActionState } from "@/lib/actions/state";
import { createClient } from "@/lib/supabase/server";

/**
 * 插件评论相关的 Server Action。
 *
 * 写操作一律走带会话的 createClient(),RLS 保证:
 * - 任何人可读未删除评论;
 * - 只能以自己的身份插入(user_id = auth.uid());
 * - 只能软删除自己的评论(update 策略限定 auth.uid() = user_id)。
 */

const NOT_CONFIGURED_ERROR = "站点未配置登录服务,请先完成 Supabase 配置。";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createCommentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createCommentSchema.safeParse({
    pluginId: formString(formData, "pluginId"),
    parentId: formString(formData, "parentId"),
    body: formString(formData, "body"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "请先登录后再评论。" };

  // 插件必须存在于目录中,防止对已下架/不存在的插件写入评论
  const plugin = await getPluginById(input.pluginId);
  if (!plugin) {
    return { error: "插件不存在或已被移除" };
  }

  // 有 parentId 时必须是同一插件下真实存在的父评论
  let parentId: string | null = null;
  if (input.parentId) {
    const { data: parent } = await supabase
      .from("plugin_comments")
      .select("id, plugin_id")
      .eq("id", input.parentId)
      .maybeSingle();
    if (!parent || parent.plugin_id !== input.pluginId) {
      return { fieldErrors: { body: "回复目标无效" } };
    }
    parentId = parent.id;
  }

  const { error } = await supabase.from("plugin_comments").insert({
    plugin_id: input.pluginId,
    user_id: user.id,
    parent_id: parentId,
    body: input.body,
  });
  if (error) {
    return { error: `评论发布失败:${error.message}` };
  }

  return { ok: true, message: "评论已发布。" };
}

export async function deleteCommentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const commentId = formString(formData, "commentId");
  if (!commentId) return { error: "找不到该评论。" };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "请先登录。" };

  // 软删除:body 不动,只标记 deleted_at;RLS 限定只能更新自己的行
  const { data, error } = await supabase
    .from("plugin_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .select("id");

  if (error) return { error: `评论删除失败:${error.message}` };
  if (!data || data.length === 0) {
    return { error: "找不到该评论或没有权限。" };
  }

  return { ok: true };
}
