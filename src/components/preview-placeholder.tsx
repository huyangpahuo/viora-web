import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShapes } from "@fortawesome/free-solid-svg-icons";

import type { PluginRecord } from "@/features/catalog/types";
import { categoryCodeToSlug, makeCategoryInfo } from "@/features/catalog/categories";
import { cn } from "@/lib/utils";

/**
 * "暂无预览"占位图与图片加载占位色。
 * 目录中目前没有真实预览字段,占位图使用分类对应的色相,
 * 但保持极低饱和、暗于卡片,像美术馆墙上的暗色展签;
 * 只表达分类归属,不冒充插件效果,不做花哨渐变。
 */

/** 20 个官方分类按顺序铺满色环;未知分类用代码哈希取色 */
const OFFICIAL_HUES = [
  265, 210, 25, 160, 330, 50, 190, 15, 225, 295, 315, 100, 70, 240, 200, 175,
  45, 55, 140, 280,
];

const OFFICIAL_CODE_ORDER = [
  "Style.Cat.Anime",
  "Style.Cat.Illustration",
  "Style.Cat.OilPainting",
  "Style.Cat.Watercolor",
  "Style.Cat.Sketch",
  "Style.Cat.Printmaking",
  "Style.Cat.Pixel",
  "Style.Cat.RetroFilm",
  "Style.Cat.ThreeD",
  "Style.Cat.Cyberpunk",
  "Style.Cat.Neon",
  "Style.Cat.Handcraft",
  "Style.Cat.PaperCraft",
  "Style.Cat.Collage",
  "Style.Cat.Photography",
  "Style.Cat.GlassMosaic",
  "Style.Cat.Metallic",
  "Style.Cat.LightParticles",
  "Style.Cat.Traditional",
  "Style.Cat.Experimental",
];

export function categoryHue(code: string | undefined): number {
  if (!code) return 265;
  const officialIndex = OFFICIAL_CODE_ORDER.indexOf(code);
  if (officialIndex >= 0) return OFFICIAL_HUES[officialIndex];
  let hash = 0;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

/** 图片加载期间(以及失败兜底层)的暗色占位底色:与分类同色相、近无彩 */
export function previewTint(code: string | undefined): string {
  return `oklch(0.185 0.015 ${categoryHue(code)})`;
}

export function PreviewPlaceholder({
  plugin,
  className,
}: {
  plugin: PluginRecord;
  className?: string;
}) {
  const hue = categoryHue(plugin.category);
  const label = plugin.category
    ? (makeCategoryInfo(plugin.category, 0).name.zh)
    : "Plugin";

  return (
    <div
      role="img"
      aria-label={`${plugin.name.zh ?? plugin.name.en ?? plugin.pluginId}(暂无预览图)`}
      className={cn(
        "preview-grain relative flex w-full items-center justify-center [background-color:var(--preview-tint)]",
        className,
      )}
      style={
        { "--preview-tint": `oklch(0.21 0.032 ${hue})` } as React.CSSProperties
      }
    >
      <div className="flex flex-col items-center gap-2 text-white/60">
        <FontAwesomeIcon icon={faShapes} className="size-7" aria-hidden />
        <span className="text-xs font-medium">{label}</span>
      </div>
    </div>
  );
}

/** 详情页/卡片通用的分类链接小标签 */
export function CategoryLink({
  code,
  name,
  count,
  className,
}: {
  code: string;
  name: { zh?: string; en?: string };
  count?: number;
  className?: string;
}) {
  return (
    <Link
      href={`/categories/${categoryCodeToSlug(code)}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground",
        className,
      )}
    >
      {name.zh ?? name.en ?? code}
      {typeof count === "number" ? (
        <span className="text-[10px] text-muted-foreground/70">{count}</span>
      ) : null}
    </Link>
  );
}
