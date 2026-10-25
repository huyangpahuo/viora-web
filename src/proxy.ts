import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 的 proxy(middleware 的新名称)。
 * 职责只有一个:在渲染前刷新 Supabase 会话 cookie。
 * 路由保护在各页面/Server Action 里按需校验,公开浏览保持无需登录。
 */
export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * 匹配除静态资源外的所有路径:
     * - _next/static、_next/image
     * - favicon、演示预览图、常见图片/字体后缀
     */
    "/((?!_next/static|_next/image|favicon.ico|demo-previews/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
