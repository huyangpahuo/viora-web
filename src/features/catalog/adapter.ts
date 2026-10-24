import { cacheLife } from "next/cache";

import fallbackRegistry from "./fallback-registry.json";
import {
  REGISTRY_EXPIRE_SECONDS,
  REGISTRY_RAW_URL,
  REGISTRY_REVALIDATE_SECONDS,
} from "./config";
import type {
  LocalizedText,
  PluginCatalog,
  PluginRecord,
} from "./types";

/**
 * registry.json 读取、校验与缓存。
 *
 * 缓存策略:use cache + cacheLife。默认每 5 分钟后台刷新
 * (REGISTRY_REVALIDATE_SECONDS 可覆盖),期间继续返回旧值;
 * GitHub 长时间不可用时,最长 7 天内仍返回旧值,
 * 之后回退到随代码版本管理的 fallback-registry.json 快照,
 * 并通过 source="snapshot" 让页面明确提示数据可能不是最新。
 */

/** 安装包路径只允许 packages/<文件名>.zip,杜绝任意外部 URL */
export const PACKAGE_PATH_PATTERN = /^packages\/[A-Za-z0-9][A-Za-z0-9._-]*\.zip$/;

const PLUGIN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export async function loadPluginCatalog(): Promise<PluginCatalog> {
  "use cache";
  cacheLife({
    stale: 60 * 60,
    revalidate: REGISTRY_REVALIDATE_SECONDS,
    expire: REGISTRY_EXPIRE_SECONDS,
  });

  try {
    const response = await fetch(REGISTRY_RAW_URL, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`registry request failed with status ${response.status}`);
    }
    const json: unknown = await response.json();
    return { ...parseRegistry(json), source: "remote" };
  } catch (error) {
    console.error(
      "[catalog] 读取线上 registry.json 失败,回退到本地快照:",
      error instanceof Error ? error.message : error,
      error instanceof Error ? error.cause : "",
    );
    return { ...parseRegistry(fallbackRegistry), source: "snapshot" };
  }
}

type ParseResult = Pick<PluginCatalog, "meta" | "plugins" | "skipped">;

export function parseRegistry(raw: unknown): ParseResult {
  const result: ParseResult = { meta: {}, plugins: [], skipped: 0 };

  if (!isRecord(raw) || !Array.isArray(raw.presets)) {
    console.error("[catalog] registry 结构异常:顶层缺少 presets 数组");
    result.skipped = Number.NaN;
    return result;
  }

  result.meta = {
    version: typeof raw.version === "number" ? raw.version : undefined,
    updated: typeof raw.updated === "string" ? raw.updated : undefined,
    declaredCount: typeof raw.count === "number" ? raw.count : undefined,
  };

  for (const entry of raw.presets) {
    const plugin = adaptEntry(entry);
    if (plugin) {
      result.plugins.push(plugin);
    } else {
      result.skipped += 1;
    }
  }

  if (result.skipped > 0) {
    console.warn(
      `[catalog] registry 中有 ${result.skipped} 个无效条目被跳过`,
    );
  }

  return result;
}

function adaptEntry(raw: unknown): PluginRecord | null {
  if (!isRecord(raw)) return null;

  const pluginId = typeof raw.pluginId === "string" ? raw.pluginId : "";
  const pkg = typeof raw.package === "string" ? raw.package : "";

  // pluginId 与 package 是路由和下载的根基,缺失或格式不对就整条丢弃
  if (!PLUGIN_ID_PATTERN.test(pluginId) || !PACKAGE_PATH_PATTERN.test(pkg)) {
    return null;
  }

  const name = parseLocalized(raw.name);
  if (!name) return null;

  const plugin: PluginRecord = {
    pluginId,
    name,
    package: pkg,
  };

  if (typeof raw.presetId === "string" && raw.presetId) {
    plugin.presetId = raw.presetId;
  }
  if (typeof raw.author === "string" && raw.author) {
    plugin.author = raw.author;
  }
  if (typeof raw.category === "string" && raw.category) {
    plugin.category = raw.category;
  }
  if (typeof raw.version === "string" && raw.version) {
    plugin.version = raw.version;
  }
  if (typeof raw.repository === "string" && /^https:\/\//.test(raw.repository)) {
    plugin.repository = raw.repository;
  }
  if (
    Array.isArray(raw.tags) &&
    raw.tags.every((t) => typeof t === "string") &&
    raw.tags.length > 0
  ) {
    plugin.tags = raw.tags;
  }

  const description = parseLocalized(raw.description);
  if (description) {
    plugin.description = description;
  }

  return plugin;
}

/**
 * name/description 允许是字符串或 {zh,en} 对象;
 * 空串、空对象都视为缺失,避免渲染出空标题。
 */
function parseLocalized(raw: unknown): LocalizedText | null {
  if (typeof raw === "string" && raw.trim()) {
    return { zh: raw.trim() };
  }
  if (!isRecord(raw)) return null;

  const text: LocalizedText = {};
  if (typeof raw.zh === "string" && raw.zh.trim()) text.zh = raw.zh.trim();
  if (typeof raw.en === "string" && raw.en.trim()) text.en = raw.en.trim();
  return text.zh || text.en ? text : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
