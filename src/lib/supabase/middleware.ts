import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * proxy 中的会话刷新:每个请求建立一次服务端客户端并触发
 * getClaims(),过期的 access token 会在这里完成刷新并写回 cookie。
 * Supabase 未配置时直接放行,站点保持纯公开画廊形态。
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        for (const [header, value] of Object.entries(headers)) {
          supabaseResponse.headers.set(header, value);
        }
      },
    },
  });

  // 触发懒初始化与刷新;网络异常不能拖垮整站
  try {
    await supabase.auth.getClaims();
  } catch (error) {
    console.error(
      "[supabase] proxy 会话刷新失败:",
      error instanceof Error ? error.message : error,
    );
  }

  return supabaseResponse;
}
