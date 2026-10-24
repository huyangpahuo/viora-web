import { getCategories, getPluginCatalog, searchPlugins } from "@/features/catalog/queries";
import { DEMO_PREVIEWS_ENABLED } from "@/features/catalog/demo";
import { CategoryChips } from "@/components/category-chips";
import { EmptyState, NoPreviewNotice } from "@/components/empty-state";
import { PluginGrid } from "@/components/plugin-grid";
import { DemoModeNotice, SnapshotNotice } from "@/components/notices";

export type CatalogSearchParams = {
  q?: string | string[];
  tag?: string | string[];
};

/**
 * 画廊结果区:读取 URL 查询参数 → 搜索/筛选 → 渲染瀑布流。
 * searchParams 是动态数据,本组件必须放在页面的 Suspense 边界内。
 */
export async function GalleryResults({
  searchParams,
  fixedCategorySlug,
}: {
  searchParams: Promise<CatalogSearchParams>;
  /** 分类页固定展示的分类;为空时表示首页(跟随 URL 的 category,目前仅 q/tag) */
  fixedCategorySlug?: string;
}) {
  const params = await searchParams;
  const q = firstParam(params.q);
  const tag = firstParam(params.tag);

  const [plugins, categories, catalog] = await Promise.all([
    searchPlugins({ q, tag, categorySlug: fixedCategorySlug }),
    getCategories(),
    getPluginCatalog(),
  ]);

  const hasFilters = Boolean(q || tag || fixedCategorySlug);

  return (
    <div className="space-y-4">
      {catalog.source === "snapshot" ? (
        <SnapshotNotice className="mx-auto max-w-7xl" />
      ) : null}
      <DemoModeNotice className="mx-auto max-w-7xl" />
      <CategoryChips categories={categories} activeSlug={fixedCategorySlug} />

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
          ——共 {plugins.length} 个插件
        </p>
      ) : null}

      {plugins.length > 0 ? (
        <>
          <PluginGrid plugins={plugins} />
          {!DEMO_PREVIEWS_ENABLED ? (
            <NoPreviewNotice className="pt-2 text-center" />
          ) : null}
        </>
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
