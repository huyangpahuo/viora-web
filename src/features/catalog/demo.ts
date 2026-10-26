import demoManifest from "./demo-previews.json";
import type { PluginRecord } from "./types";

/**
 * 演示预览模式。
 *
 * registry 目前没有任何真实预览图字段。为了让瀑布流的变高布局、
 * 懒加载和详情页视觉可以在开发/演示环境得到验证,这里把本地测试图
 * 按 pluginId 稳定映射为占位预览。
 *
 * 该模式必须显式通过环境变量开启,并且开启时页面顶部会出现
 * "演示数据"横幅。图片不是任何插件的真实效果,绝不能在
 * 生产环境当作插件效果展示。
 */
export const DEMO_PREVIEWS_ENABLED =
  process.env.NEXT_PUBLIC_DEMO_PREVIEWS === "true";

type DemoManifest = {
  images: Record<string, number[]>;
};

const manifest = demoManifest as unknown as DemoManifest;

const demoFiles = Object.keys(manifest.images).sort();

/** djb2,对同一 pluginId 永远映射到同一张图 */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export type DemoPreview = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export function getDemoPreview(plugin: PluginRecord): DemoPreview | null {
  if (!DEMO_PREVIEWS_ENABLED || demoFiles.length === 0) return null;
  const file = demoFiles[hashString(plugin.pluginId) % demoFiles.length];
  const dims = manifest.images[file] ?? [900, 600];
  const width = dims[0] ?? 900;
  const height = dims[1] ?? 600;
  const name = plugin.name.zh ?? plugin.name.en ?? plugin.pluginId;
  return {
    src: `/demo-previews/${file}`,
    width,
    height,
    alt: `${name}(演示占位图,非插件真实效果)`,
  };
}
