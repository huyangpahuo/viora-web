import { Suspense } from "react";

import { GalleryResults } from "@/components/gallery-results";
import { PluginGridSkeleton } from "@/components/plugin-grid";
import { getPluginCatalog } from "@/features/catalog/queries";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <section className="space-y-1 pt-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          发现 Viora 风格插件
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          以视觉方式浏览 Viora 官方风格化插件,支持关键词搜索与分类筛选,
          点击卡片查看详情并获取安装包。
        </p>
      </section>

      <Suspense fallback={<PluginGridSkeleton />}>
        <GalleryResults searchParams={searchParams} />
      </Suspense>

      <CatalogFooter />
    </div>
  );
}

/** 目录摘要信息:数量来自目录本身,不再突出 registry 的版本元数据 */
async function CatalogFooter() {
  const catalog = await getPluginCatalog();
  return (
    <p className="pt-4 text-center text-xs text-muted-foreground">
      共 {catalog.plugins.length} 个插件
      {catalog.sitePluginCount > 0
        ? ` · 其中 ${catalog.sitePluginCount} 个由作者在站点发布`
        : ""}
      {Number.isFinite(catalog.skipped) && catalog.skipped > 0
        ? ` · ${catalog.skipped} 个无效条目已跳过`
        : ""}
    </p>
  );
}
