"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { fieldErrors } from "@/features/auth/schemas";
import { getCurrentUser } from "@/features/auth/session";
import {
  createReplySchema,
  createThreadSchema,
} from "@/features/community/schemas";
import type { ActionState } from "@/lib/actions/state";
import { createClient } from "@/lib/supabase/server";

/**
 * 社区讨论相关的 Server Action。
 *
 * 写操作一律走带会话的 createClient(),RLS 保证:
 * - 所有人可读未删除的讨论与回复;
 * - 只能以自己的身份发帖/回复(author_id = auth.uid());
 * - 只能软删除自己的帖子/回复(update 策略限定 auth.uid() = author_id)。
 *
 * 软删除只置 deleted_at,内容保留;SELECT 策略允许作者读回自己的
 * 已删除行,避免 update ... select 返回 0 行时被误判为 RLS 报错。
 */

const NOT_CONFIGURED_ERROR = "站点未配置登录服务,请先完成 Supabase 配置。";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** 发布讨论:成功后跳转到讨论详情页(redirect 不能被 try/catch 包住) */
export async function createThreadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createThreadSchema.safeParse({
    title: formString(formData, "title"),
    body: formString(formData, "body"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "请先登录后再发帖。" };

  const { data, error } = await supabase
    .from("community_threads")
    .insert({
      author_id: user.id,
      title: input.title,
      body: input.body,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: `发布失败:${error?.message ?? "未知错误"}` };
  }

  revalidatePath("/community");
  redirect(`/community/${data.id}`);
}

/** 发布回复:线程必须存在且未删除;成功后留在详情页并刷新 */
export async function createReplyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createReplySchema.safeParse({
    threadId: formString(formData, "threadId"),
    body: formString(formData, "body"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "请先登录后再回复。" };

  // 讨论必须真实存在且未删除,防止向已下架讨论写入回复
  const { data: thread } = await supabase
    .from("community_threads")
    .select("id, deleted_at")
    .eq("id", input.threadId)
    .maybeSingle();
  if (!thread || thread.deleted_at) {
    return { error: "该讨论不存在或已被删除。" };
  }

  const { error } = await supabase.from("community_replies").insert({
    thread_id: input.threadId,
    author_id: user.id,
    body: input.body,
  });
  if (error) {
    return { error: `回复发布失败:${error.message}` };
  }

  revalidatePath(`/community/${input.threadId}`);
  return { ok: true, message: "回复已发布。" };
}

/** 删除自己的讨论(软删除),成功后回到社区列表页 */
export async function deleteThreadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const threadId = formString(formData, "threadId");
  if (!threadId) return { error: "找不到该讨论。" };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "请先登录。" };

  // 软删除:title/body 不动,只标记 deleted_at;RLS 限定只能更新自己的行
  const { data, error } = await supabase
    .from("community_threads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", threadId)
    .select("id");

  if (error) return { error: `讨论删除失败:${error.message}` };
  if (!data || data.length === 0) {
    return { error: "找不到该讨论或没有权限。" };
  }

  revalidatePath("/community");
  redirect("/community");
}

/** 删除自己的回复(软删除),成功后留在详情页 */
export async function deleteReplyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const replyId = formString(formData, "replyId");
  if (!replyId) return { error: "找不到该回复。" };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "请先登录。" };

  const { data, error } = await supabase
    .from("community_replies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", replyId)
    .select("id");

  if (error) return { error: `回复删除失败:${error.message}` };
  if (!data || data.length === 0) {
    return { error: "找不到该回复或没有权限。" };
  }

  const threadId = formString(formData, "threadId");
  revalidatePath("/community");
  if (threadId) revalidatePath(`/community/${threadId}`);
  return { ok: true };
}
