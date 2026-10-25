import { NextResponse } from "next/server";

import { getSitePlugins } from "@/features/catalog/community";

/**
 * Viora 客户端的社区插件目录 API(公开,无需登录)。
 *
 * 返回与 GitHub registry.json 兼容的形状({ version, updated, count, presets }),
 * 客户端用同一套解析器识别数据库记录的插件。与 registry 的两点差异:
 * - 不带 presetId(数据库不记录;客户端安装后按 pluginId 识别);
 * - `package` 是作者仓库内安装包的绝对直链(raw.githubusercontent.com),
 *   客户端按 http(s) 直链下载,不再拼接官方仓库地址。
 *
 * 未上传 zip 的条目(downloadUrl 回退源码 zipball)不进入此列表:
 * 源码包没有编译产物,装不进客户端。
 */
export async function GET() {
  const plugins = await getSitePlugins();

  const presets = plugins
    .filter((plugin) => plugin.package.length > 0)
    .map((plugin) => ({
      pluginId: plugin.pluginId,
      name: {
        zh: plugin.name.zh ?? plugin.pluginId,
        ...(plugin.name.en ? { en: plugin.name.en } : {}),
      },
      author: plugin.author ?? plugin.owner?.username ?? "",
      category: plugin.category ?? "Style.Cat.Experimental",
      version: plugin.version ?? "1.0.0",
      package: plugin.downloadUrl ?? "",
      repository: plugin.repository ?? "",
      tags: plugin.tags ?? [],
      description: {
        zh: plugin.description?.zh ?? "",
        ...(plugin.description?.en ? { en: plugin.description.en } : {}),
      },
    }));

  return NextResponse.json(
    {
      version: 1,
      updated: new Date().toISOString().slice(0, 10),
      count: presets.length,
      presets,
    },
    // getSitePlugins 自带 60s 缓存;HTTP 层再给 CDN 一层短缓存
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
