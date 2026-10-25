import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "./config";
import type { Database } from "./database.types";

/**
 * 匿名服务端客户端:不读写任何请求 cookie。
 *
 * 用途:`use cache` 缓存函数内的公开数据读取(如站点插件目录)。
 * Next 16 禁止在 "use cache" 里调用 cookies(),而公开数据本就不该
 * 依赖请求上下文——这里以匿名身份访问,RLS 策略照常生效
 * (例如 plugins 表只能读到 status='published' 的行)。
 *
 * 需要用户会话的读取请改用 ./server 的 createClient。
 */
export function createAnonClient() {
  if (!isSupabaseConfigured) return null;

  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
