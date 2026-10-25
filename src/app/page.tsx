import { Suspense } from "react";

import { GalleryResults } from "@/components/gallery-results";
import { PluginGridSkeleton } from "@/components/plugin-grid";
import { getPluginCatalog } from "@/features/catalog/queries";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12 sm:px-6">
      <Hero />

      <Suspense fallback={<PluginGridSkeleton />}>
        <GalleryResults searchParams={searchParams} />
      </Suspense>

      <CatalogFooter />
    </div>
  );
}

/**
 * 画廊门厅:大标题 + 真实目录数据(插件总数来自目录本身),
 * 说明性长句做减法,只保留一句功能提示。
 */
async function Hero() {
  const catalog = await getPluginCatalog();

  return (
    <section className="pb-8 pt-12 sm:pb-10 sm:pt-16">
      <h1 className="max-w-3xl font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
        Viora 风格插件画廊
      </h1>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">
        共收录 {catalog.plugins.length} 个风格化效果插件,支持关键词搜索与分类筛选。
      </p>
    </section>
  );
}

/** 目录摘要信息:数量来自目录本身,不再突出 registry 的版本元数据 */
async function CatalogFooter() {
  const catalog = await getPluginCatalog();
  return (
    <div className="pt-6 text-center text-xs text-muted-foreground">
      {catalog.sitePluginCount > 0 ? (
        <p>其中 {catalog.sitePluginCount} 个由作者在站点发布。</p>
      ) : null}
      {Number.isFinite(catalog.skipped) && catalog.skipped > 0 ? (
        <p>{catalog.skipped} 个无效条目已跳过。</p>
      ) : null}
    </div>
  );
}
