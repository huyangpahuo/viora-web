import "server-only";

/**
 * GitHub 仓库操作封装:为社区作者在自己的账号下创建插件仓库。
 * 只使用用户授权给站点的 user-to-server 令牌,不涉及任何站点级密钥。
 */

const API_BASE = "https://api.github.com";

function apiHeaders(token: string) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json",
    "x-github-api-version": "2022-11-28",
  };
}

export type CreatedRepo = {
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  ownerLogin: string;
};

export type CreateRepoResult =
  | { ok: true; repo: CreatedRepo }
  | { ok: false; code: "name_taken" | "unauthorized" | "rate_limited" | "unknown"; message: string };

/** 在用户自己的账号下创建公开仓库(含初始 README,保证分支存在) */
export async function createUserRepo(options: {
  token: string;
  name: string;
  description: string;
  homepage?: string;
}): Promise<CreateRepoResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/user/repos`, {
      method: "POST",
      headers: apiHeaders(options.token),
      body: JSON.stringify({
        name: options.name,
        description: options.description || undefined,
        homepage: options.homepage || undefined,
        private: false,
        has_issues: true,
        has_wiki: false,
        auto_init: true,
      }),
    });
  } catch (error) {
    return {
      ok: false,
      code: "unknown",
      message: `无法连接 GitHub:${error instanceof Error ? error.message : "网络错误"}`,
    };
  }

  if (response.ok) {
    const repo = (await response.json()) as {
      full_name?: string;
      html_url?: string;
      default_branch?: string;
      owner?: { login?: string };
    };
    if (
      !repo.full_name ||
      !repo.html_url ||
      !repo.default_branch ||
      !repo.owner?.login
    ) {
      return { ok: false, code: "unknown", message: "GitHub 返回的仓库信息不完整" };
    }
    return {
      ok: true,
      repo: {
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch,
        ownerLogin: repo.owner.login,
      },
    };
  }

  if (response.status === 422) {
    return {
      ok: false,
      code: "name_taken",
      message: "你的 GitHub 账号下已有同名仓库,换个项目标识或先去 GitHub 删除旧仓库",
    };
  }
  if (response.status === 401) {
    return { ok: false, code: "unauthorized", message: "GitHub 授权已失效,请重新关联 GitHub 账号" };
  }
  if (response.status === 403 || response.status === 429) {
    return { ok: false, code: "rate_limited", message: "GitHub 接口限流,请稍后再试" };
  }

  const body = await response.text();
  return {
    ok: false,
    code: "unknown",
    message: `GitHub 创建仓库失败(HTTP ${response.status})${body.slice(0, 200)}`,
  };
}

export type CommitFileResult =
  | { ok: true }
  | { ok: false; message: string };

/** 向新仓库提交 plugin.json 元数据(尽力而为,失败不阻断发布) */
export async function commitPluginJson(options: {
  token: string;
  fullName: string;
  branch: string;
  pluginJson: Record<string, unknown>;
}): Promise<CommitFileResult> {
  try {
    const response = await fetch(
      `${API_BASE}/repos/${options.fullName}/contents/plugin.json`,
      {
        method: "PUT",
        headers: apiHeaders(options.token),
        body: JSON.stringify({
          message: "chore: 由 Viora Plugins 网站初始化 plugin.json",
          content: Buffer.from(
            JSON.stringify(options.pluginJson, null, 2),
            "utf8",
          ).toString("base64"),
          branch: options.branch,
        }),
      },
    );
    if (response.ok) return { ok: true };
    const body = await response.text();
    return {
      ok: false,
      message: `plugin.json 提交失败(HTTP ${response.status})${body.slice(0, 200)}`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `plugin.json 提交失败:${error instanceof Error ? error.message : "网络错误"}`,
    };
  }
}

/**
 * 社区插件的安装包直链:源码 zipball。
 * 只允许 github.com 域名,URL 由服务端根据仓库名拼接,不接受用户自由输入。
 */
export function buildArchiveZipUrl(fullName: string, branch: string): string {
  return `https://github.com/${fullName}/archive/refs/heads/${encodeURIComponent(branch)}.zip`;
}
