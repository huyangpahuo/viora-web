import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/session";
import { encryptToken } from "@/lib/crypto/token-crypto";
import {
  GITHUB_STATE_COOKIE,
  exchangeCodeForToken,
  fetchGithubUser,
  verifyLinkState,
} from "@/lib/github/oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** 每个出口(成功或失败)都要清掉一次性 state cookie */
function redirectWithStateCookieCleared(
  request: NextRequest,
  path: string,
): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.set(GITHUB_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

/**
 * "关联 GitHub"回调:校验 state → 换令牌 → 取 GitHub 用户 →
 * 加密落库(github_identities)并同步展示字段(profiles)。
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const cookieValue = request.cookies.get(GITHUB_STATE_COOKIE)?.value ?? "";

  if (!verifyLinkState(state, cookieValue)) {
    return redirectWithStateCookieCleared(request, "/settings/profile?github=state_error");
  }

  if (!code) {
    return redirectWithStateCookieCleared(request, "/settings/profile?github=error");
  }

  const exchange = await exchangeCodeForToken(code);
  if (exchange.error || !exchange.accessToken) {
    return redirectWithStateCookieCleared(request, "/settings/profile?github=error");
  }

  const githubUser = await fetchGithubUser(exchange.accessToken);
  if (!githubUser) {
    return redirectWithStateCookieCleared(request, "/settings/profile?github=error");
  }

  const user = await getCurrentUser();
  if (!user) {
    return redirectWithStateCookieCleared(request, "/login?next=/settings/profile");
  }

  // 密钥未配置时禁止落库,宁可失败也不存明文
  const encrypted = encryptToken(exchange.accessToken);
  if (!encrypted) {
    return redirectWithStateCookieCleared(request, "/settings/profile?github=not_configured");
  }

  const admin = createAdminClient();
  if (!admin) {
    return redirectWithStateCookieCleared(request, "/settings/profile?github=not_configured");
  }

  const { error: upsertError } = await admin
    .from("github_identities")
    .upsert(
      {
        user_id: user.id,
        github_id: githubUser.id,
        github_login: githubUser.login,
        avatar_url: githubUser.avatarUrl,
        access_token_encrypted: encrypted,
        scopes: exchange.scope ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (upsertError) {
    return redirectWithStateCookieCleared(request, "/settings/profile?github=error");
  }

  const supabase = await createClient();
  if (!supabase) {
    return redirectWithStateCookieCleared(request, "/settings/profile?github=error");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ github_login: githubUser.login, github_avatar_url: githubUser.avatarUrl })
    .eq("id", user.id);
  if (profileError) {
    return redirectWithStateCookieCleared(request, "/settings/profile?github=error");
  }

  return redirectWithStateCookieCleared(request, "/settings/profile?github=linked");
}
