/**
 * 插件仓库与目录拉取配置。
 *
 * 这些值只描述公开的 GitHub 仓库,不含任何密钥;
 * 提供环境变量覆盖是为了本地联调其他数据源,不是安全边界。
 */

export const REPO_OWNER = "huyangpahuo";
export const REPO_NAME = "Viora-plugins";
export const REPO_BRANCH = "main";

export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

export const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}`;

export const REGISTRY_RAW_URL =
  process.env.REGISTRY_RAW_URL ?? `${RAW_BASE_URL}/registry.json`;

/** 目录缓存刷新间隔(秒)。缓存策略见 adapter.ts 的 use cache + cacheLife */
export const REGISTRY_REVALIDATE_SECONDS = parsePositiveInt(
  process.env.REGISTRY_REVALIDATE_SECONDS,
  300,
);

/** 目录最长可接受过期时间(秒)。超过后才彻底丢弃缓存并回退快照 */
export const REGISTRY_EXPIRE_SECONDS = 7 * 24 * 60 * 60;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
