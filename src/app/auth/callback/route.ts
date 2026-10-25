import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Supabase 邮件验证 / 密码重置的回跳端点:
 * 用 URL 里的 code 换取会话,再按 next 参数(仅限站内路径)跳转。
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const nextRaw = request.nextUrl.searchParams.get("next");

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=callback", request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=callback", request.url));
  }

  // 防开放重定向:只接受站内绝对路径
  const next =
    typeof nextRaw === "string" && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/";

  return NextResponse.redirect(new URL(next, request.url));
}
