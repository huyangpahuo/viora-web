import Link from "next/link";

import { getDemoPreview } from "@/features/catalog/demo";
import { makeCategoryInfo } from "@/features/catalog/categories";
import type { PluginRecord } from "@/features/catalog/types";
import {
  PreviewPlaceholder,
  previewTint,
} from "@/components/preview-placeholder";
import { PreviewImage } from "@/components/preview-image";
import { cn } from "@/lib/utils";

/**
 * 瀑布流卡片。「暗房间」里的作品卡:图片是主体,
 * 信息区只留名称、版本、分类与作者;层级靠亮度差,不靠重阴影。
 * 卡片只展示目录里可证实的信息,不展示任何虚构的评分或下载量。
 */
export function PluginCard({
  plugin,
  preload = false,
  className,
}: {
  plugin: PluginRecord;
  /** 首屏前几张图立即加载且不做淡入 */
  preload?: boolean;
  className?: string;
}) {
  const name = plugin.name.zh ?? plugin.name.en ?? plugin.pluginId;
  const demo = getDemoPreview(plugin);

  return (
    <Link
      href={`/plugins/${encodeURIComponent(plugin.pluginId)}`}
      className={cn(
        "group block break-inside-avoid overflow-hidden rounded-2xl border bg-card outline-none",
        "transition-[border-color,transform] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-foreground/20",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <div
        className="relative w-full overflow-hidden [background-color:var(--preview-tint)]"
        style={
          demo
            ? {
                aspectRatio: `${demo.width} / ${demo.height}`,
                // 颜色经 CSS 变量消费:内联 background-color 会成为
                // Dark Reader 等插件的注入点,导致 hydration 误报
                "--preview-tint": previewTint(plugin.category),
              } as React.CSSProperties
            : undefined
        }
      >
        {demo ? (
          <>
            <PreviewImage
              src={demo.src}
              alt={demo.alt}
              fill
              preload={preload}
              fallback={
                <PreviewPlaceholder
                  plugin={plugin}
                  className="absolute inset-0"
                />
              }
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw"
              className="object-cover group-hover:scale-[1.02]"
            />
            {/* hover 提亮:用一层低透明白的 opacity 过渡,只动 opacity */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-white opacity-0 transition-opacity duration-200 group-hover:opacity-[0.07]"
            />
          </>
        ) : (
          <PreviewPlaceholder plugin={plugin} className="aspect-[4/3]" />
        )}
      </div>

      <div className="space-y-1 p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-medium leading-snug text-foreground">
            {name}
          </h3>
          {plugin.version ? (
            <span className="shrink-0 text-[11px] leading-none text-muted-foreground">
              v{plugin.version}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {plugin.category ? (
            <span className="truncate transition-colors group-hover:text-foreground/80">
              {makeCategoryInfo(plugin.category, 0).name.zh}
            </span>
          ) : null}
          {plugin.author ? (
            <span className="truncate text-muted-foreground/80">
              {plugin.author}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
