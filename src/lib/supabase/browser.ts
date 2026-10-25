import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "./config";
import type { Database } from "./database.types";

/** 浏览器端 Supabase 客户端;未配置 Supabase 时返回 null。 */
export function createClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
