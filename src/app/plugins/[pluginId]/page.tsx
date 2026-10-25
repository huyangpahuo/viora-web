import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowUpRightFromSquare,
  faBox,
  faDownload,
  faTag,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

import { PluginGrid } from "@/components/plugin-grid";
import { PreviewPlaceholder } from "@/components/preview-placeholder";
import { DemoModeNotice, SnapshotNotice } from "@/components/notices";
import { PluginNoticeBar } from "./notice-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getDemoPreview } from "@/features/catalog/demo";
import { makeCategoryInfo } from "@/features/catalog/categories";
import {
  getDownloadUrl,
  getPluginById,
  getPluginCatalog,
  getPluginRepositoryUrl,
  getRelatedPlugins,
} from "@/features/catalog/queries";

type Params = Promise<{ pluginId: string }>;

export async function generateStaticParams() {
  const catalog = await getPluginCatalog();
  return catalog.plugins.map((plugin) => ({
    pluginId: encodeURIComponent(plugin.pluginId),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const plugin = await getPluginById(await decodeId(params));
  if (!plugin) return { title: "插件未找到" };

  const name = plugin.name.zh ?? plugin.name.en ?? plugin.pluginId;
  return {
    title: `${name}(${plugin.version ? `v${plugin.version}` : "插件"})`,
    description:
      plugin.description?.zh ??
      plugin.description?.en ??
      `${name} — Viora 风格化插件。`,
  };
}

export default async function PluginDetailPage({
  params,
}: PageProps<"/plugins/[pluginId]">) {
  const plugin = await getPluginById(await decodeId(params));

  if (!plugin) {
    notFound();
  }

  const related = await getRelatedPlugins(plugin);
  const catalog = await getPluginCatalog();
  const packageUrl = getDownloadUrl(plugin);
  const repositoryUrl = getPluginRepositoryUrl(plugin);
  const demo = getDemoPreview(plugin);
  const name = plugin.name.zh ?? plugin.name.en ?? plugin.pluginId;
  const secondaryName =
    plugin.name.en && plugin.name.zh && plugin.name.en !== plugin.name.zh
      ? plugin.name.en
      : null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      {/* 创建项目后服务端跳转可能携带 ?notice=<plugin.json 初始化失败原因> */}
      <Suspense fallback={null}>
        <PluginNoticeBar />
      </Suspense>

      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 rounded"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-4" aria-hidden />
        返回画廊
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        {/* 预览区:有真实预览时显示图片;当前目录无预览字段,默认显示分类色占位 */}
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl border bg-card">
            {demo ? (
              <Image
                src={demo.src}
                alt={demo.alt}
                width={demo.width}
                height={demo.height}
                priority
                className="h-auto w-full object-cover"
              />
            ) : (
              <PreviewPlaceholder
                plugin={plugin}
                className="aspect-[16/10]"
              />
            )}
          </div>
          {catalog.source === "snapshot" ? <SnapshotNotice /> : null}
          <DemoModeNotice />
        </div>

        {/* 元信息面板 */}
        <div className="space-y-5 self-start rounded-2xl border bg-card/60 p-5 lg:sticky lg:top-20">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            {secondaryName ? (
              <p className="text-sm text-muted-foreground">{secondaryName}</p>
            ) : null}
            <p className="font-mono text-xs text-muted-foreground/70">
              {plugin.pluginId}
            </p>
          </div>

          <dl className="space-y-2.5 text-sm">
            {plugin.owner ? (
              <MetaRow icon={<FontAwesomeIcon icon={faUser} className="size-4" aria-hidden />} label="作者">
                <Link
                  href={`/users/${encodeURIComponent(plugin.owner.username)}`}
                  className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline"
                >
                  {plugin.owner.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={plugin.owner.avatarUrl}
                      alt=""
                      className="size-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
                      {(plugin.owner.displayName ?? plugin.owner.username)
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  {plugin.owner.displayName ?? plugin.owner.username}
                </Link>
              </MetaRow>
            ) : plugin.author ? (
              <MetaRow icon={<FontAwesomeIcon icon={faUser} className="size-4" aria-hidden />} label="作者">
                {plugin.author}
              </MetaRow>
            ) : null}
            {plugin.category ? (
              <MetaRow icon={<FontAwesomeIcon icon={faTag} className="size-4" aria-hidden />} label="分类">
                <Link
                  href={`/categories/${makeCategoryInfo(plugin.category, 0).slug}`}
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {makeCategoryInfo(plugin.category, 0).name.zh}
                </Link>
              </MetaRow>
            ) : null}
            {plugin.version ? (
              <MetaRow icon={<FontAwesomeIcon icon={faBox} className="size-4" aria-hidden />} label="版本">
                <Badge variant="secondary" className="font-mono text-xs">
                  v{plugin.version}
                </Badge>
              </MetaRow>
            ) : null}
          </dl>

          {plugin.tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {plugin.tags.map((tag) => (
                <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}>
                  <Badge
                    variant="outline"
                    className="px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {packageUrl ? (
              <Button asChild className="w-full">
                <a href={packageUrl} download>
                  <FontAwesomeIcon icon={faDownload} className="size-4" aria-hidden />
                  下载安装包 .zip
                </a>
              </Button>
            ) : (
              <p className="text-xs text-destructive/90">
                安装包路径未通过校验,已隐藏下载链接。
              </p>
            )}
            <Button variant="outline" asChild className="w-full">
              <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="size-4" aria-hidden />
                在 GitHub 查看仓库
              </a>
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              安装包由插件作者托管在自己的 GitHub 仓库中。
            </p>
          </div>
        </div>
      </div>

      {/* 描述 */}
      {plugin.description ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">插件介绍</h2>
          {plugin.description.zh ? (
            <p className="max-w-3xl text-sm leading-relaxed text-foreground/90">
              {plugin.description.zh}
            </p>
          ) : null}
          {plugin.description.en && plugin.description.en !== plugin.description.zh ? (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {plugin.description.en}
            </p>
          ) : null}
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">同类插件</h2>
            <Separator className="flex-1" />
            {plugin.category ? (
              <Link
                href={`/categories/${makeCategoryInfo(plugin.category, 0).slug}`}
                className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                查看全部分类
              </Link>
            ) : null}
          </div>
          <PluginGrid
            plugins={related}
            className="columns-2 sm:columns-3 xl:columns-3 2xl:columns-3"
          />
        </section>
      ) : null}
    </div>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <dt className="sr-only">{label}</dt>
      <dd className="text-foreground/90">{children}</dd>
    </div>
  );
}

async function decodeId(params: Params): Promise<string> {
  const { pluginId } = await params;
  try {
    return decodeURIComponent(pluginId);
  } catch {
    return pluginId;
  }
}
