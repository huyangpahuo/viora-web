import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GalleryResults } from "@/components/gallery-results";
import { PluginGridSkeleton } from "@/components/plugin-grid";
import { getCategories, getCategoryBySlug } from "@/features/catalog/queries";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(decodeURIComponent(slug));
  if (!category) return { title: "分类未找到" };
  return {
    title: `${category.name.zh}风格插件`,
    description: `浏览 ${category.name.zh}(${category.name.en ?? ""})分类下的 Viora 风格化插件。`,
  };
}

export default async function CategoryPage({
  params,
}: PageProps<"/categories/[slug]">) {
  // 分类在 Suspense 之外解析,未知 slug 能以真正的 404 状态响应
  const { slug } = await params;
  const category = await getCategoryBySlug(decodeURIComponent(slug));

  if (!category) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <Suspense fallback={<PluginGridSkeleton />}>
        <div className="space-y-5">
          <section className="space-y-1 pt-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {category.name.zh}风格插件
            </h1>
            <p className="text-sm text-muted-foreground">
              {category.name.en ? `${category.name.en} · ` : ""}
              共 {category.count} 个插件 · 分类代码 {category.code}
            </p>
          </section>

          <GalleryResults
            searchParams={Promise.resolve({})}
            fixedCategorySlug={category.slug}
          />
        </div>
      </Suspense>
    </div>
  );
}
