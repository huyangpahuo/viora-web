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

/** contents API 对路径逐段编码,允许 "plugins/<id>/plugin.json" 这类多级路径 */
function encodeContentsPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function mapContentsError(prefix: string, status: number, body: string): CommitFileResult {
  if (status === 401) {
    return { ok: false, message: `${prefix}:GitHub 授权已失效,请重新关联 GitHub 账号` };
  }
  if (status === 403 || status === 429) {
    return { ok: false, message: `${prefix}:GitHub 接口限流,请稍后再试` };
  }
  return { ok: false, message: `${prefix}(HTTP ${status})${body.slice(0, 200)}` };
}

/**
 * 向仓库提交(创建或更新)一个文本文件。
 * existingSha 传入时为更新已有文件,不传则为新建;失败不阻断发布流程。
 */
export async function commitTextFile(options: {
  token: string;
  fullName: string;
  branch: string;
  path: string;
  content: string;
  existingSha?: string;
}): Promise<CommitFileResult> {
  const prefix = `文件 ${options.path} 提交失败`;
  try {
    const response = await fetch(
      `${API_BASE}/repos/${options.fullName}/contents/${encodeContentsPath(options.path)}`,
      {
        method: "PUT",
        headers: apiHeaders(options.token),
        body: JSON.stringify({
          message: `chore: 由 Viora Plugins 网站更新 ${options.path}`,
          content: Buffer.from(options.content, "utf8").toString("base64"),
          branch: options.branch,
          ...(options.existingSha ? { sha: options.existingSha } : {}),
        }),
      },
    );
    if (response.ok) return { ok: true };
    const body = await response.text();
    return mapContentsError(prefix, response.status, body);
  } catch (error) {
    return {
      ok: false,
      message: `${prefix}:${error instanceof Error ? error.message : "网络错误"}`,
    };
  }
}

export type RepoInfo = CreatedRepo;

export type GetRepoResult =
  | { ok: true; repo: RepoInfo | null }
  | { ok: false; code: "unauthorized" | "rate_limited" | "unknown"; message: string };

/** 查询仓库是否存在;404 返回 repo: null,其余错误走 ok: false */
export async function getRepo(token: string, fullName: string): Promise<GetRepoResult> {
  try {
    // full_name 含 "/",必须逐段编码(整体 encode 会把 / 变成 %2F 导致 404)
    const apiPath = fullName
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const response = await fetch(`${API_BASE}/repos/${apiPath}`, {
      headers: apiHeaders(token),
    });
    if (response.status === 404) return { ok: true, repo: null };
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
    if (response.status === 401) {
      return {
        ok: false,
        code: "unauthorized",
        message: "GitHub 授权已失效,请重新关联 GitHub 账号",
      };
    }
    if (response.status === 403 || response.status === 429) {
      return { ok: false, code: "rate_limited", message: "GitHub 接口限流,请稍后再试" };
    }
    const body = await response.text();
    return {
      ok: false,
      code: "unknown",
      message: `GitHub 查询仓库失败(HTTP ${response.status})${body.slice(0, 200)}`,
    };
  } catch (error) {
    return {
      ok: false,
      code: "unknown",
      message: `无法连接 GitHub:${error instanceof Error ? error.message : "网络错误"}`,
    };
  }
}

export type GetJsonFileResult =
  | { ok: true; file: { content: string; sha: string } | null }
  | { ok: false; message: string };

/** 读取仓库中的 JSON 文本文件并 base64 解码;文件不存在返回 file: null */
export async function getJsonFile(options: {
  token: string;
  fullName: string;
  branch: string;
  path: string;
}): Promise<GetJsonFileResult> {
  try {
    const response = await fetch(
      `${API_BASE}/repos/${options.fullName}/contents/${encodeContentsPath(options.path)}?ref=${encodeURIComponent(options.branch)}`,
      { headers: apiHeaders(options.token) },
    );
    if (response.status === 404) return { ok: true, file: null };
    if (!response.ok) {
      const body = await response.text();
      const prefix = `文件 ${options.path} 读取失败`;
      const message =
        response.status === 401
          ? `${prefix}:GitHub 授权已失效,请重新关联 GitHub 账号`
          : response.status === 403 || response.status === 429
            ? `${prefix}:GitHub 接口限流,请稍后再试`
            : `${prefix}(HTTP ${response.status})${body.slice(0, 200)}`;
      return { ok: false, message };
    }
    const payload = (await response.json()) as {
      content?: string;
      sha?: string;
    };
    if (typeof payload.content !== "string" || typeof payload.sha !== "string") {
      return { ok: false, message: `文件 ${options.path} 返回内容不完整` };
    }
    const content = Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString(
      "utf8",
    );
    return { ok: true, file: { content, sha: payload.sha } };
  } catch (error) {
    return {
      ok: false,
      message: `文件 ${options.path} 读取失败:${error instanceof Error ? error.message : "网络错误"}`,
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
