import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/features/catalog/database-types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * 会话与资料的唯一服务端入口。
 *
 * 读取会话属于动态数据:调用方必须在 <Suspense> 边界内使用
 * (cacheComponents 模式下,在边界外读 cookies 会导致构建失败)。
 * 写入前的身份校验一律用 getUser()(向 Supabase 校验 JWT),
 * 不使用可被伪造的 getSession()。
 */

export type SessionUser = {
  id: string;
  email: string | undefined;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { id: user.id, email: user.email ?? undefined };
}

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
}

/** 受保护页面用:未登录直接跳转登录页并记录回跳地址 */
export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}
