import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { SITE_URL } from "@/lib/supabase/config";

/**
 * "关联 GitHub"专用 OAuth(经典 GitHub OAuth App,不经过 Supabase)。
 *
 * 为什么不用 Supabase 的 GitHub 登录令牌:
 * 登录用 OAuth 的 scope 只有 read:user,拿不到创建仓库的权限;
 * Supabase 的 linkIdentity 也不便于对已关联身份追加 scope。
 * 这里用独立的 OAuth App(需要 repo scope),令牌只用于创建仓库,
 * 加密后存 github_identities,与登录会话完全解耦。
 */

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";

export const GITHUB_LINK_SCOPES = "repo read:user user:email";

export const GITHUB_STATE_COOKIE = "viora_gh_link_state";

export function getGithubLinkConfig() {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET ?? "";
  return { clientId, clientSecret, configured: Boolean(clientId && clientSecret) };
}

export const GITHUB_LINK_REDIRECT_PATH = "/api/auth/github/callback";

export function buildAuthorizeUrl(state: string): string {
  const { clientId } = getGithubLinkConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${SITE_URL}${GITHUB_LINK_REDIRECT_PATH}`,
    scope: GITHUB_LINK_SCOPES,
    state,
    allow_signup: "false",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * 生成并签名 state:随机值防 CSRF,HMAC 防伪造;
 * 随机值同时写入 httpOnly cookie,回调时双向比对。
 */
export function createLinkState(): { state: string; cookieValue: string } {
  const nonce = randomBytes(24).toString("hex");
  return { state: nonce, cookieValue: `${nonce}.${signNonce(nonce)}` };
}

export function verifyLinkState(state: string, cookieValue: string): boolean {
  if (!state || !cookieValue) return false;
  const [nonce, signature] = cookieValue.split(".");
  if (!nonce || !signature) return false;
  const expected = signNonce(nonce);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  // state 查询参数必须与 cookie 里的 nonce 一致
  return state.length === nonce.length && timingSafeEqual(Buffer.from(state), Buffer.from(nonce));
}

function signNonce(nonce: string): string {
  const secret = process.env.GITHUB_OAUTH_CLIENT_SECRET ?? "";
  return createHmac("sha256", secret).update(nonce).digest("hex");
}

export type GithubTokenExchange = {
  accessToken?: string;
  scope?: string;
  error?: string;
};

export async function exchangeCodeForToken(
  code: string,
): Promise<GithubTokenExchange> {
  const { clientId, clientSecret } = getGithubLinkConfig();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${SITE_URL}${GITHUB_LINK_REDIRECT_PATH}`,
    }),
  });

  if (!response.ok) {
    return { error: `GitHub 令牌交换失败(HTTP ${response.status})` };
  }

  const payload = (await response.json()) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (payload.error || !payload.access_token) {
    return {
      error: payload.error_description ?? payload.error ?? "GitHub 令牌交换失败",
    };
  }

  return { accessToken: payload.access_token, scope: payload.scope };
}

export type GithubUserInfo = {
  id: number;
  login: string;
  avatarUrl: string | null;
};

export async function fetchGithubUser(
  accessToken: string,
): Promise<GithubUserInfo | null> {
  const response = await fetch(USER_URL, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) return null;

  const user = (await response.json()) as {
    id?: number;
    login?: string;
    avatar_url?: string;
  };
  if (typeof user.id !== "number" || typeof user.login !== "string") return null;

  return { id: user.id, login: user.login, avatarUrl: user.avatar_url ?? null };
}
