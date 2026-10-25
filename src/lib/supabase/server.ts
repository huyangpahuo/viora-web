import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "./config";
import type { Database } from "./database.types";

/**
 * 服务端 Supabase 客户端(RSC / Server Action / Route Handler 共用)。
 *
 * 返回 null 表示站点未配置 Supabase:调用方必须优雅降级,
 * 公开浏览不能因此不可用。
 *
 * setAll 里的 headers 参数在 RSC 上下文中无法写入响应头,
 * 会话刷新的 Set-Cookie 由 src/proxy.ts 统一负责,这里忽略。
 */
export async function createClient(): Promise<SupabaseClient<Database> | null> {
  if (!isSupabaseConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 在纯 Server Component 中写 cookie 会抛错(只能由 proxy 刷新),
          // 这里吞掉即可;真正的会话刷新入口是 proxy。
        }
      },
    },
  });
}
