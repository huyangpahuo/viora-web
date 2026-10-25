import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/session";
import { isTokenEncryptionConfigured } from "@/lib/crypto/token-crypto";
import {
  GITHUB_STATE_COOKIE,
  buildAuthorizeUrl,
  createLinkState,
  getGithubLinkConfig,
} from "@/lib/github/oauth";

/**
 * "关联 GitHub"入口:校验前置条件后跳转 GitHub 授权页,
 * 并种下一次性签名 state cookie(回调时双向比对,防 CSRF)。
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/settings/profile", request.url));
  }

  const { configured } = getGithubLinkConfig();
  if (!configured || !isTokenEncryptionConfigured()) {
    return NextResponse.redirect(
      new URL("/settings/profile?github=not_configured", request.url),
    );
  }

  const { state, cookieValue } = createLinkState();

  const response = NextResponse.redirect(buildAuthorizeUrl(state));
  response.cookies.set(GITHUB_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production" || request.url.startsWith("https"),
  });
  return response;
}
