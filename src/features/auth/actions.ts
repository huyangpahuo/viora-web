"use server";

import { redirect } from "next/navigation";

import { fieldErrors } from "@/features/auth/schemas";
import { getCurrentUser } from "@/features/auth/session";
import { unlinkGithubAction as unlinkGithubActionImpl } from "@/features/projects/actions";
import type { ActionState } from "@/lib/actions/state";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updateProfileSchema,
} from "@/features/auth/schemas";

/**
 * 认证与资料相关的 Server Action。
 *
 * 约定:
 * - 返回值是可序列化的 ActionState,配合 useActionState 使用;
 * - 成功需要跳转时在 action 内 redirect()(它通过抛异常工作,
 *   因此绝不能用 try/catch 包住调用链);
 * - 未配置 Supabase 时统一返回诚实的中文提示,而不是崩溃。
 */

const NOT_CONFIGURED_ERROR = "站点未配置登录服务,请先完成 Supabase 配置。";

/** 表单字段兜底取值:非字符串(如缺失)一律当作空串,让 zod 报中文错误 */
function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** 登录后回跳路径:只允许站内绝对路径,防开放重定向 */
function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}

/** 把 Supabase Auth 的常见错误映射成诚实、可操作的中文提示 */
function mapAuthError(fallback: string, error: Error): ActionState {
  const raw = error.message.toLowerCase();
  if (raw.includes("invalid login credentials")) {
    return { error: "邮箱或密码不正确" };
  }
  if (raw.includes("email not confirmed")) {
    return { error: "请先点击邮件中的链接完成邮箱验证" };
  }
  if (raw.includes("rate limit")) {
    return { error: "尝试过于频繁,请稍后再试" };
  }
  return { error: fallback };
}

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return mapAuthError(`登录失败:${error.message}`, error);
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    username: formString(formData, "username"),
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  // 用户名先行查重(数据库触发器在注册回调里还有冲突兜底)
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();
  if (taken) {
    return { fieldErrors: { username: "该用户名已被使用" } };
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/`,
      data: { username: parsed.data.username },
    },
  });
  if (error) {
    return mapAuthError(`注册失败:${error.message}`, error);
  }

  // 项目关闭了邮箱确认时,signUp 直接返回会话,进入站点
  if (data.session) {
    redirect("/");
  }

  return { needsConfirmation: true, email: parsed.data.email };
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formString(formData, "email"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/auth/reset-password`,
  });
  if (error) {
    if (error.message.toLowerCase().includes("rate limit")) {
      return { error: "发送过于频繁,请稍后再试。" };
    }
    return { error: `重置链接发送失败:${error.message}` };
  }

  return { ok: true, message: "重置链接已发送,请查收邮箱。" };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "登录状态已失效,请重新点击重置链接。" };

  const parsed = resetPasswordSchema.safeParse({
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.message.toLowerCase().includes("rate limit")) {
      return { error: "尝试过于频繁,请稍后再试。" };
    }
    return { error: `密码修改失败:${error.message}` };
  }

  redirect("/login?reset=1");
}

export async function signOutAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateProfileSchema.safeParse({
    username: formString(formData, "username"),
    displayName: formString(formData, "displayName"),
    bio: formString(formData, "bio"),
    avatarUrl: formString(formData, "avatarUrl"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "登录状态已失效,请重新登录后再试。" };

  // 用户名只允许被“其他用户”占用时拦截;改回自己当前的名字不算冲突
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();
  if (taken && taken.id !== user.id) {
    return { fieldErrors: { username: "该用户名已被使用" } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      display_name: parsed.data.displayName ? parsed.data.displayName : null,
      bio: parsed.data.bio ? parsed.data.bio : null,
      avatar_url: parsed.data.avatarUrl ? parsed.data.avatarUrl : null,
    })
    .eq("id", user.id);

  if (error) {
    // 唯一约束兜底(先行查重与写入之间存在并发窗口)
    if (error.code === "23505") {
      return { fieldErrors: { username: "该用户名已被使用" } };
    }
    return { error: `资料更新失败:${error.message}` };
  }

  return { ok: true, message: "资料已更新。" };
}

/**
 * 注销账号:要求用户输入自己的用户名确认。
 *
 * 顺序:校验用户名 → admin.deleteUser(级联删除 profiles/plugins/
 * plugin_comments/github_identities)→ signOut → redirect("/")。
 * redirect() 通过抛异常工作,绝不能被 try/catch 包住;
 * GitHub 上的仓库不会被删除,由 UI 如实提示。
 */
export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };

  const user = await getCurrentUser();
  if (!user) return { error: "登录状态已失效,请重新登录。" };

  const confirm = formString(formData, "confirm").trim().toLowerCase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || confirm !== profile.username) {
    return { fieldErrors: { confirm: "请输入你的用户名以确认" } };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { error: "站点未配置注销服务,请先完成服务端配置。" };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: `注销失败:${error.message}` };
  }

  await supabase.auth.signOut();
  redirect("/");
}

/**
 * 解除 GitHub 关联(账号设置页用)。
 *
 * 实现位于 @/features/projects/actions(与发布流程共用令牌管理);
 * 这里提供同签名转发,保证从 auth 域导入的 UI 也能拿到该 action。
 */
export async function unlinkGithubAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return unlinkGithubActionImpl(_prev, formData);
}
