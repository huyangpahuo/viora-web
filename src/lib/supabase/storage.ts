import "server-only";

import { SUPABASE_URL } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * 插件预览图(转换前/后)上传:写入 Storage 桶 plugin-previews。
 *
 * 桶策略(见 supabase/migrations/20261026000000_stage3_comments_previews.sql):
 * 公开可读;登录用户只能写以自己用户 ID 命名的一级目录。
 * 这里使用带会话的 createClient(),RLS 照常生效。
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
  if (file.size > PREVIEW_MAX_BYTES) {
    return "预览图不能超过 5MB";
  }
  return null;
}

export type UploadPreviewResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * 上传一张预览图,返回公开访问 URL。
 * 路径:<userId>/<pluginId>-<kind>-<时间戳>.<ext>,时间戳避免同名覆盖历史图。
 */
export async function uploadPreviewImage(
  file: File,
  userId: string,
  pluginId: string,
  kind: "before" | "after",
): Promise<UploadPreviewResult> {
  const typeError = validatePreviewFile(file);
  if (typeError) return { ok: false, message: typeError };

  const ext = ALLOWED_PREVIEW_TYPES[file.type];
  const path = `${userId}/${pluginId}-${kind}-${Date.now()}.${ext}`;

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, message: "站点未配置登录服务,无法上传预览图。" };
  }

  const { error } = await supabase.storage.from("plugin-previews").upload(
    path,
    Buffer.from(await file.arrayBuffer()),
    { contentType: file.type, upsert: false },
  );
  if (error) {
    return { ok: false, message: `预览图上传失败:${error.message}` };
  }

  return {
    ok: true,
    url: `${SUPABASE_URL}/storage/v1/object/public/plugin-previews/${path}`,
  };
}
