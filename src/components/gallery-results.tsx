import { getCurrentUser } from "@/features/auth/session";
import {
  getCategories,
  getPluginCatalog,
  searchPlugins,
} from "@/features/catalog/queries";
import { DEMO_PREVIEWS_ENABLED } from "@/features/catalog/demo";
import type { PluginRecord } from "@/features/catalog/types";
import { getFollowedAuthors, getPluginSocialCounts } from "@/features/social/queries";
import { CategoryChips } from "@/components/category-chips";
import { FeedTabs, type FeedTab } from "@/components/feed-tabs";
import { EmptyState, NoPreviewNotice } from "@/components/empty-state";
import { PluginGrid } from "@/components/plugin-grid";
import { DemoModeNotice, SnapshotNotice } from "@/components/notices";

export type CatalogSearchParams = {
  q?: string | string[];
  tag?: string | string[];
  tab?: string | string[];
};

/**
 * 画廊结果区:读取 URL 查询参数 → 搜索/筛选 → 信息流整理 → 渲染瀑布流。
 * searchParams 是动态数据,本组件必须放在页面的 Suspense 边界内
 * (首页的"关注"Tab 在这里读取会话,同样依赖该边界)。
 *
 * 首页(无 fixedCategorySlug)按 Tab 整理信息流:
 * - 最新(默认):按作者去重;
 * - 推荐:去重后按互动热度(真实点赞+收藏计数)降序;
 * - 关注:只保留已关注作者的作品(登录可见)。
 * 分类页固定展示全量,不做去重。
 */
export async function GalleryResults({
  searchParams,
  fixedCategorySlug,
}: {
  searchParams: Promise<CatalogSearchParams>;
  /** 分类页固定展示的分类;为空时表示首页(跟随 URL 的 q/tag/tab) */
  fixedCategorySlug?: string;
}) {
  const params = await searchParams;
  const q = firstParam(params.q);
  const tag = firstParam(params.tag);
  const tab = normalizeFeedTab(firstParam(params.tab));

  // 分类页不显示信息流 Tab,也就无需读取会话
  const showFeedTabs = !fixedCategorySlug;
  const user = showFeedTabs ? await getCurrentUser() : null;

  const [plugins, categories, catalog] = await Promise.all([
    searchPlugins({ q, tag, categorySlug: fixedCategorySlug }),
    getCategories(),
    getPluginCatalog(),
  ]);

  let feedPlugins = plugins;
  if (showFeedTabs) {
    if (tab === "recommended") {
      // 热度来自真实点赞/收藏计数(带缓存,交互后由 action 失效)
      const counts = await getPluginSocialCounts(
        plugins.map((plugin) => plugin.pluginId),
      );
      feedPlugins = sortFeedByHeat(dedupeByAuthor(plugins), counts);
    } else if (tab === "following" && user) {
      const followedAuthors = await getFollowedAuthors(user.id);
      feedPlugins = filterByFollowedAuthors(plugins, followedAuthors);
    } else {
      feedPlugins = dedupeByAuthor(plugins);
    }
  }

  const hasFilters = Boolean(q || tag || fixedCategorySlug);
  const showCategoryChips = Boolean(fixedCategorySlug) || tab === "latest";

  return (
    <div className="space-y-4">
      {catalog.source === "snapshot" ? (
        <SnapshotNotice className="mx-auto max-w-[1600px]" />
      ) : null}
      <DemoModeNotice className="mx-auto max-w-[1600px]" />
      {showFeedTabs ? (
        <FeedTabs
          activeTab={tab}
          q={q}
          tag={tag}
          showFollowing={Boolean(user)}
        />
      ) : null}
      {showCategoryChips ? (
        <CategoryChips categories={categories} activeSlug={fixedCategorySlug} />
      ) : null}

      {q || tag ? (
        <p className="text-sm text-muted-foreground">
          {q ? (
            <>
              关键词“<span className="text-foreground">{q}</span>”
            </>
          ) : null}
          {q && tag ? "、" : null}
          {tag ? (
            <>
              标签“<span className="text-foreground">{tag}</span>”
            </>
          ) : null}
          ——共 {feedPlugins.length} 个插件
        </p>
      ) : null}

      {feedPlugins.length > 0 ? (
        <>
          <PluginGrid plugins={feedPlugins} />
          {!DEMO_PREVIEWS_ENABLED ? (
            <NoPreviewNotice className="pt-2 text-center" />
          ) : null}
        </>
      ) : tab === "following" && showFeedTabs ? (
        <FollowFeedEmptyState />
      ) : (
        <EmptyState hasFilters={hasFilters} />
      )}
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeFeedTab(value: string | undefined): FeedTab {
  return value === "recommended" || value === "following"
    ? value
    : "latest";
}

/**
 * 信息流按作者去重。去重键:
 * - site 来源用发布者 owner.username;
 * - registry 来源用 author 显示名字符串(如 "Viora Team");
 * - 两者都没有时退回 pluginId 本身(不合并)。
 * 同一作者保留目录顺序中最靠前的一条:site 来源按 created 倒序入库,
 * 即保留最新发布的一个;registry 来源保持原顺序取第一个。
 */
function dedupeByAuthor(plugins: PluginRecord[]): PluginRecord[] {
  const seen = new Set<string>();
  const result: PluginRecord[] = [];
  for (const plugin of plugins) {
    const key = authorKeyOf(plugin);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(plugin);
  }
  return result;
}

function authorKeyOf(plugin: PluginRecord): string {
  if (plugin.source === "site" && plugin.owner?.username) {
    return `user:${plugin.owner.username}`;
  }
  if (plugin.author) return `name:${plugin.author}`;
  return `plugin:${plugin.pluginId}`;
}

/** 推荐排序:互动热度(点赞+收藏,真实计数)降序;同热度与无数据保持原相对顺序 */
function sortFeedByHeat(
  plugins: PluginRecord[],
  counts: Record<string, { likes: number; favorites: number }>,
): PluginRecord[] {
  const heatOf = (plugin: PluginRecord) =>
    (counts[plugin.pluginId]?.likes ?? 0) +
    (counts[plugin.pluginId]?.favorites ?? 0);

  return plugins
    .map((plugin, index) => ({ plugin, index }))
    .sort(
      (a, b) => heatOf(b.plugin) - heatOf(a.plugin) || a.index - b.index,
    )
    .map((entry) => entry.plugin);
}

/**
 * 关注流过滤:site 插件按发布者 username 匹配;
 * registry 插件按 author 字符串与关注作者的 username/显示名匹配
 * (registry 作者只是显示名,匹配不到就少展示,不虚构)。
 */
function filterByFollowedAuthors(
  plugins: PluginRecord[],
  followedAuthors: { username: string; displayName: string | null }[],
): PluginRecord[] {
  const usernameSet = new Set(followedAuthors.map((author) => author.username));
  const nameSet = new Set(
    followedAuthors
      .map((author) => author.displayName)
      .filter((name): name is string => Boolean(name)),
  );

  return plugins.filter((plugin) => {
    if (plugin.source === "site") {
      return plugin.owner ? usernameSet.has(plugin.owner.username) : false;
    }
    if (plugin.author) {
      return usernameSet.has(plugin.author) || nameSet.has(plugin.author);
    }
    return false;
  });
}

/** 关注 Tab 的空状态:诚实说明而不是套用"搜索无结果"文案 */
function FollowFeedEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <h2 className="text-base font-medium">关注的作者还没有更新</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        去插件详情页关注喜欢的作者,他们的新作品会出现在这里。
      </p>
    </div>
  );
}
