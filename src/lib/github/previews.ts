import "server-only";

import { commitBinaryFile } from "@/lib/github/repos";

/**
 * 插件预览图(转换前/后)上传:直接提交到作者自己的 hub 仓库
 * (viora-plugins-hub),替代此前的 Supabase Storage,减轻存储压力。
 *
 * 路径:previews/<pluginId>/before-<时间戳>.<ext>,时间戳避免同名覆盖历史图;
 * 公开访问地址为 raw.githubusercontent.com 直链,站点数据库只存该 URL。
 */

export const PREVIEW_MAX_BYTES = 5 * 1024 * 1024;

/** 允许的图片 MIME → 扩展名 */
const ALLOWED_PREVIEW_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const PREVIEW_ACCEPT = Object.keys(ALLOWED_PREVIEW_TYPES).join(",");

/** 类型/大小校验:通过返回 null,不通过返回中文错误(供 fieldErrors 使用) */
export function validatePreviewFile(file: File): string | null {
  if (!(file.type in ALLOWED_PREVIEW_TYPES)) {
    return "预览图只支持 PNG、JPG 或 WebP 格式";
  }
  // 浏览器允许选中 0 字节文件:name 非空但内容为空,不能当作有效图片提交
  if (file.size <= 0) {
    return "预览图文件是空的,请重新选择";
  }
  if (file.size > PREVIEW_MAX_BYTES) {
    return "预览图不能超过 5MB";
  }
  return null;
}

export type PreviewKind = "before" | "after";

/**
 * 把一张预览图提交到作者仓库,返回 raw.githubusercontent.com 直链。
 * 校验失败或提交失败时抛出带中文信息的错误;调用方应先用
 * validatePreviewFile 把可预期的校验问题映射为字段级错误,再调用本函数。
 */
export async function uploadPreviewToRepo(options: {
  file: File;
  token: string;
  /** 作者仓库 full_name,如 "someone/viora-plugins-hub" */
  hubFullName: string;
  branch: string;
  pluginId: string;
  kind: PreviewKind;
}): Promise<string> {
  const typeError = validatePreviewFile(options.file);
  if (typeError) throw new Error(typeError);

  const ext = ALLOWED_PREVIEW_TYPES[options.file.type];
  const path = `previews/${options.pluginId}/${options.kind}-${Date.now()}.${ext}`;
  const base64 = Buffer.from(await options.file.arrayBuffer()).toString("base64");

  const committed = await commitBinaryFile({
    token: options.token,
    fullName: options.hubFullName,
    branch: options.branch,
    path,
    base64Content: base64,
  });
  if (!committed.ok) throw new Error(committed.message);

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${options.hubFullName}/${encodeURIComponent(options.branch)}/${encodedPath}`;
}

/** 从预览图 URL 解析仓库内相对路径;不属于该仓库或非 raw 链接返回 null */
export function previewRepoPathFromUrl(
  url: string,
  repoFullName: string,
): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "raw.githubusercontent.com") return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    // raw 链接形如 /<owner>/<repo>/<branch>/<path...>
    if (segments.length < 4) return null;
    const [owner, repo, , ...pathSegments] = segments;
    if (`${owner}/${repo}`.toLowerCase() !== repoFullName.toLowerCase()) {
      return null;
    }
    return pathSegments.map(decodeURIComponent).join("/");
  } catch {
    return null;
  }
}

/**
 * 旧版 Supabase Storage 的预览图 URL → 桶内相对路径。
 * 改造前上传的图片仍存于 plugin-previews 桶,删除项目时也应清理。
 */
export function legacyStoragePathFromUrl(
  url: string,
  supabaseUrl: string,
): string | null {
  try {
    const base = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/plugin-previews/`;
    if (!url.startsWith(base)) return null;
    return url.slice(base.length);
  } catch {
    return null;
  }
}
