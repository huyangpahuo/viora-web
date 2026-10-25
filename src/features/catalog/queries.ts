import { makeCategoryInfo, sortCategories } from "./categories";
import { RAW_BASE_URL, REPO_URL } from "./config";
import { loadPluginCatalog, PACKAGE_PATH_PATTERN } from "./adapter";
import { getSitePlugins } from "./community";
import type {
  CategoryInfo,
  PluginCatalog,
  PluginRecord,
  SearchFilters,
} from "./types";

/**
 * 页面统一使用的目录查询入口。
 *
 * 两条来源管道在这里平等合并:
 * - registry 来源:GitHub 上的 registry.json(如 huyangpahuo/Viora-plugins,
 *   只是一个独立来源,没有特殊地位)
 * - site 来源:作者在站点发布、记录在数据库的插件
 * 所有页面共享同一个适配器,不允许绕过它直接取数。
 */

export async function getPluginCatalog(): Promise<PluginCatalog> {
  const [registryCatalog, sitePlugins] = await Promise.all([
    loadPluginCatalog(),
    getSitePlugins(),
  ]);

  const byPluginId = new Map<string, PluginRecord>();
  for (const plugin of registryCatalog.plugins) {
    byPluginId.set(plugin.pluginId, plugin);
  }
  for (const plugin of sitePlugins) {
    // registry 条目与站点记录冲突时,以作者主动发布的站点记录为准
    byPluginId.set(plugin.pluginId, plugin);
  }

  return {
    meta: registryCatalog.meta,
    plugins: [...byPluginId.values()],
    skipped: registryCatalog.skipped,
    source: registryCatalog.source,
    sitePluginCount: sitePlugins.length,
  };
}

export async function getPluginById(
  pluginId: string,
): Promise<PluginRecord | null> {
  const catalog = await getPluginCatalog();
  return catalog.plugins.find((p) => p.pluginId === pluginId) ?? null;
}

export async function getCategories(): Promise<CategoryInfo[]> {
  const catalog = await getPluginCatalog();
  const counts = new Map<string, number>();
  for (const plugin of catalog.plugins) {
    if (!plugin.category) continue;
    counts.set(plugin.category, (counts.get(plugin.category) ?? 0) + 1);
  }
  const categories = [...counts.entries()].map(([code, count]) =>
    makeCategoryInfo(code, count),
  );
  return sortCategories(categories);
}

export async function getCategoryBySlug(
  slug: string,
): Promise<CategoryInfo | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

function localizedHaystack(text: { zh?: string; en?: string } | undefined) {
  return `${text?.zh ?? ""}\n${text?.en ?? ""}`.toLowerCase();
}

export async function searchPlugins(
  filters: SearchFilters,
): Promise<PluginRecord[]> {
  const catalog = await getPluginCatalog();
  const q = normalizeParam(filters.q).toLowerCase().trim();
  const tag = normalizeParam(filters.tag).trim();

  let plugins = catalog.plugins;

  if (filters.categorySlug) {
    const categories = await getCategories();
    const category = categories.find((c) => c.slug === filters.categorySlug);
    if (!category) return [];
    plugins = plugins.filter((p) => p.category === category.code);
  }

  if (tag) {
    plugins = plugins.filter((p) => p.tags?.includes(tag));
  }

  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    plugins = plugins.filter((p) => {
      const haystack = [
        localizedHaystack(p.name),
        localizedHaystack(p.description),
        p.pluginId.toLowerCase(),
        p.presetId?.toLowerCase() ?? "",
        p.author?.toLowerCase() ?? "",
        p.category?.toLowerCase() ?? "",
        ...(p.tags ?? []),
      ].join("\n");
      return terms.every((term) => haystack.includes(term));
    });
  }

  return plugins;
}

/** 同分类的其他插件,详情页"同类插件"用;最多 limit 个 */
export async function getRelatedPlugins(
  plugin: PluginRecord,
  limit = 6,
): Promise<PluginRecord[]> {
  if (!plugin.category) return [];
  const catalog = await getPluginCatalog();
  return catalog.plugins
    .filter(
      (p) => p.pluginId !== plugin.pluginId && p.category === plugin.category,
    )
    .slice(0, limit);
}

/**
 * 生成可信的安装包下载地址。
 * - registry 来源:只接受该来源仓库内 packages/*.zip 路径
 * - site 来源:使用入库时服务端拼接的直链(仅 github.com 域名)
 * 校验失败返回 null,由 UI 隐藏下载按钮。
 */
export function getDownloadUrl(plugin: PluginRecord): string | null {
  if (plugin.source === "site") {
    if (!plugin.downloadUrl || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/archive\//.test(plugin.downloadUrl)) {
      return null;
    }
    return plugin.downloadUrl;
  }

  if (!PACKAGE_PATH_PATTERN.test(plugin.package)) return null;
  const fileName = plugin.package.slice("packages/".length);
  return `${RAW_BASE_URL}/packages/${fileName}`;
}

/** 插件作者仓库地址(registry 来源缺省指向其来源仓库) */
export function getPluginRepositoryUrl(plugin: PluginRecord): string {
  return plugin.repository ?? REPO_URL;
}

function normalizeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
