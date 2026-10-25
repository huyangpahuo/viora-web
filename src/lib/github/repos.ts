import "server-only";

/**
 * GitHub 仓库操作封装:为社区作者在自己的账号下创建插件仓库。
 * 只使用用户授权给站点的 user-to-server 令牌,不涉及任何站点级密钥。
 */

const API_BASE = "https://api.github.com";

/**
 * 作者专属仓库的固定名称(每位作者一个仓库,所有插件都登记在里面)。
 * 刻意避开 "viora-plugins":GitHub 仓库名大小写不敏感,官方作者的
 * Viora-plugins 仓库曾因重名导致社区插件内容被误提交进官方仓库。
 */
export const AUTHOR_REPO_SUFFIX = "viora-plugins-hub";

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
      message:
        "你的 GitHub 账号下已有一个占用该名称的仓库,请到 GitHub 改名或删除后再发布",
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

/**
 * 向仓库提交(创建或更新)一个二进制文件,内容以 base64 传入(如预览图、zip 安装包)。
 * existingSha 传入时为更新已有文件(覆盖 zip 时必带,否则 GitHub 返回 422)。
 * 失败不阻断调用方流程,错误经返回值带出。
 */
export async function commitBinaryFile(options: {
  token: string;
  fullName: string;
  branch: string;
  path: string;
  base64Content: string;
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
          message: `chore: 由 Viora Plugins 网站上传 ${options.path}`,
          content: options.base64Content,
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
      // GitHub 对 GET /repos/{owner}/{repo} 做大小写不敏感的重定向:
      // 请求 "a/viora-plugins-hub" 可能命中 "a/Viora-plugins" 这类大小写不同的仓库。
      // 返回的 full_name 与期望名称(不区分大小写)不一致时按"不存在"处理,
      // 让上层走创建流程并由 422 给出撞名提示,避免把内容误提交进他人仓库。
      if (repo.full_name.toLowerCase() !== fullName.toLowerCase()) {
        return { ok: true, repo: null };
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

export type GetFileShaResult =
  | { ok: true; sha: string | null }
  | { ok: false; message: string };

/** 查询仓库中某个文件的 blob sha(覆盖或删除前取 existingSha 用);不存在返回 null */
export async function getFileSha(options: {
  token: string;
  fullName: string;
  branch: string;
  path: string;
}): Promise<GetFileShaResult> {
  try {
    const response = await fetch(
      `${API_BASE}/repos/${options.fullName}/contents/${encodeContentsPath(options.path)}?ref=${encodeURIComponent(options.branch)}`,
      { headers: apiHeaders(options.token) },
    );
    if (response.status === 404) return { ok: true, sha: null };
    if (!response.ok) {
      const body = await response.text();
      // mapContentsError 的返回形状比本函数宽,失败分支收敛后原样带出
      const mapped = mapContentsError(`文件 ${options.path} 读取失败`, response.status, body);
      return mapped.ok === false ? mapped : { ok: true, sha: null };
    }
    const payload = (await response.json()) as { sha?: string };
    if (typeof payload.sha !== "string") {
      return { ok: false, message: `文件 ${options.path} 返回内容不完整` };
    }
    return { ok: true, sha: payload.sha };
  } catch (error) {
    return {
      ok: false,
      message: `文件 ${options.path} 读取失败:${error instanceof Error ? error.message : "网络错误"}`,
    };
  }
}

export type ListDirectoryResult =
  | { ok: true; files: { path: string; sha: string }[] }
  | { ok: false; message: string };

/**
 * 列出仓库内某个目录下的文件(不递归子目录)。
 * 目录不存在视为空目录(返回空数组),用于"删掉整个目录内容"的场景。
 */
export async function listDirectory(options: {
  token: string;
  fullName: string;
  branch: string;
  path: string;
}): Promise<ListDirectoryResult> {
  const prefix = `目录 ${options.path} 读取失败`;
  try {
    const response = await fetch(
      `${API_BASE}/repos/${options.fullName}/contents/${encodeContentsPath(options.path)}?ref=${encodeURIComponent(options.branch)}`,
      { headers: apiHeaders(options.token) },
    );
    if (response.status === 404) return { ok: true, files: [] };
    if (!response.ok) {
      const body = await response.text();
      const mapped = mapContentsError(prefix, response.status, body);
      return mapped.ok === false ? mapped : { ok: true, files: [] };
    }
    const payload = (await response.json()) as Array<{
      path?: string;
      sha?: string;
      type?: string;
    }>;
    if (!Array.isArray(payload)) {
      return { ok: false, message: `${prefix}:返回内容不完整` };
    }
    return {
      ok: true,
      files: payload
        .filter(
          (entry): entry is { path: string; sha: string; type: string } =>
            entry.type === "file" &&
            typeof entry.path === "string" &&
            typeof entry.sha === "string",
        )
        .map((entry) => ({ path: entry.path, sha: entry.sha })),
    };
  } catch (error) {
    return {
      ok: false,
      message: `${prefix}:${error instanceof Error ? error.message : "网络错误"}`,
    };
  }
}

export type DeleteFileResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * 删除仓库中的一个文件:先取 sha,再走 contents API 的 DELETE。
 * 文件不存在视为已删除,返回成功;删除阶段的 404 同理(并发窗口)。
 */
export async function deleteFile(options: {
  token: string;
  fullName: string;
  branch: string;
  path: string;
}): Promise<DeleteFileResult> {
  const prefix = `文件 ${options.path} 删除失败`;
  const current = await getFileSha(options);
  if (!current.ok) return { ok: false, message: current.message };
  if (current.sha === null) return { ok: true };

  try {
    const response = await fetch(
      `${API_BASE}/repos/${options.fullName}/contents/${encodeContentsPath(options.path)}`,
      {
        method: "DELETE",
        headers: apiHeaders(options.token),
        body: JSON.stringify({
          message: `chore: 由 Viora Plugins 网站移除 ${options.path}`,
          sha: current.sha,
          branch: options.branch,
        }),
      },
    );
    if (response.ok || response.status === 404) return { ok: true };
    const body = await response.text();
    return mapContentsError(prefix, response.status, body);
  } catch (error) {
    return {
      ok: false,
      message: `${prefix}:${error instanceof Error ? error.message : "网络错误"}`,
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
