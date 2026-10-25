/**
 * Supabase 环境配置。
 *
 * 阶段二起站点接入 Supabase(认证 + 社区插件目录),
 * 但所有变量都是可选的:未配置时站点退化为"仅公开画廊",
 * 登录/发布等入口显示诚实的"未配置"状态,而不是报错崩溃。
 *
 * 注意:NEXT_PUBLIC_* 会内联进客户端 bundle,这里只放公开项目地址
 * 与 publishable key;service role key 绝不能出现在这里。
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY,
);

/** 站点对外地址:OAuth 回调、邮件链接拼接用 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
