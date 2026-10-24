import Image from "next/image";
import Link from "next/link";

import { getDemoPreview } from "@/features/catalog/demo";
import { makeCategoryInfo } from "@/features/catalog/categories";
import type { PluginRecord } from "@/features/catalog/types";
import { Badge } from "@/components/ui/badge";
import {
  PreviewPlaceholder,
} from "@/components/preview-placeholder";
import { cn } from "@/lib/utils";

/**
 * 瀑布流卡片。卡片只展示目录里可证实的信息:
 * 名称、分类、版本、标签;不展示任何虚构的评分或下载量。
 * 预览区域高度随图片自然比例变化(演示模式)或使用统一占位(默认模式)。
 */
export function PluginCard({
  plugin,
  priority = false,
  className,
}: {
  plugin: PluginRecord;
  priority?: boolean;
  className?: string;
}) {
  const name = plugin.name.zh ?? plugin.name.en ?? plugin.pluginId;
  const secondaryName =
    plugin.name.en && plugin.name.zh && plugin.name.en !== plugin.name.zh
      ? plugin.name.en
      : null;
  const demo = getDemoPreview(plugin);

  return (
    <Link
      href={`/plugins/${encodeURIComponent(plugin.pluginId)}`}
      className={cn(
        "group block break-inside-avoid overflow-hidden rounded-xl border bg-card/60 outline-none",
        "transition-all hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.35)]",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <div
        className="relative w-full overflow-hidden bg-muted"
        style={demo ? { aspectRatio: `${demo.width} / ${demo.height}` } : undefined}
      >
        {demo ? (
          <Image
            src={demo.src}
            alt={demo.alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <PreviewPlaceholder plugin={plugin} className="aspect-[4/3]" />
        )}
      </div>

      <div className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm leading-snug font-medium text-foreground">
            {name}
          </h3>
          {plugin.version ? (
            <Badge
              variant="secondary"
              className="shrink-0 px-1.5 py-0 text-[10px] text-muted-foreground"
            >
              v{plugin.version}
            </Badge>
          ) : null}
        </div>

        {secondaryName ? (
          <p className="text-xs text-muted-foreground">{secondaryName}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {plugin.category ? (
            <span className="transition-colors group-hover:text-foreground/80">
              {makeCategoryInfo(plugin.category, 0).name.zh}
            </span>
          ) : null}
          {plugin.author ? <span>{plugin.author}</span> : null}
        </div>

        {plugin.tags?.length ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {plugin.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
