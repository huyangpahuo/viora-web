import { PluginCard } from "@/components/plugin-card";
import type { PluginRecord } from "@/features/catalog/types";

/**
 * Pinterest 风格瀑布流。
 *
 * 采用 CSS multi-column 实现:纯服务端渲染、无 JS、无布局抖动。
 * 阅读顺序为"先纵向后横向"(与 DOM/键盘顺序一致)。
 * 卡片使用 break-inside-avoid 保证不被拆到两列。
 */
export function PluginGrid({
  plugins,
  className,
}: {
  plugins: PluginRecord[];
  className?: string;
}) {
  const firstPreloadCount = 6;

  return (
    <div
      className={
        "columns-2 gap-3 sm:columns-3 sm:gap-4 xl:columns-4 2xl:columns-5 min-[1800px]:columns-6 " +
        (className ?? "")
      }
    >
      {plugins.map((plugin, index) => (
        <PluginCard
          key={plugin.pluginId}
          plugin={plugin}
          preload={index < firstPreloadCount}
          className="mb-3 sm:mb-4"
        />
      ))}
    </div>
  );
}

/** 首页/分类页加载时的瀑布流骨架 */
export function PluginGridSkeleton({ count = 12 }: { count?: number }) {
  const heights = [220, 160, 260, 190, 240, 170, 210, 280, 180, 230, 200, 260];
  return (
    <div
      aria-hidden
      className="columns-2 gap-3 sm:columns-3 sm:gap-4 xl:columns-4 2xl:columns-5 min-[1800px]:columns-6"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="mb-3 break-inside-avoid rounded-2xl border bg-card sm:mb-4"
        >
          <div
            className="bg-muted/40"
            style={{ height: heights[i % heights.length] }}
          />
          <div className="space-y-2 p-3.5">
            <div className="h-3.5 w-2/3 rounded bg-muted/70" />
            <div className="h-3 w-1/3 rounded bg-muted/50" />
          </div>
        </div>
      ))}
    </div>
  );
}
