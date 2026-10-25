import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * service role 客户端:绕过 RLS,仅限服务端使用。
 *
 * 当前唯一用途:读写 `github_identities`(GitHub 关联令牌)。
 * 这张表对所有客户端角色全部拒绝访问,令牌字段是加密后的密文;
 * service role key 只存在于服务端环境变量,绝不进入客户端 bundle。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
