"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";

import { FieldError } from "@/components/projects/project-form-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** 与服务端 storage.ts 保持一致的校验规则 */
const PREVIEW_MAX_BYTES = 5 * 1024 * 1024;
const PREVIEW_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function validateClient(file: File): string | null {
  if (!PREVIEW_TYPES.has(file.type)) {
    return "预览图只支持 PNG、JPG 或 WebP 格式";
  }
  if (file.size > PREVIEW_MAX_BYTES) {
    return "预览图不能超过 5MB";
  }
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 转换前/后效果图上传位。
 * 选择文件后立即用本地 objectURL 预览,超限即时红字提示;
 * 服务端会再做一次同样的校验。编辑场景可传 existingUrl 展示当前图。
 */
export function PreviewUploadField({
  name,
  label,
  required = false,
  existingUrl,
  serverError,
}: {
  /** 提交字段名:previewBefore / previewAfter */
  name: string;
  label: string;
  /** 新建时必填;编辑时为可选替换 */
  required?: boolean;
  /** 编辑场景已保存的图片 URL */
  existingUrl?: string | null;
  serverError?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  // 释放本地 objectURL:依赖变化时清理旧 URL,卸载时清理当前 URL
  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const error = clientError ?? serverError;
  const shownUrl = objectUrl ?? existingUrl ?? null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-destructive" aria-hidden>*</span> : null}
      </Label>
      <div className="flex items-start gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {shownUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownUrl} alt={`${label}预览`} className="h-full w-full object-cover" />
          ) : (
            <FontAwesomeIcon icon={faImage} className="size-5 text-muted-foreground/60" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Input
            id={name}
            name={name}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/*"
            required={required}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              if (!next) {
                setFile(null);
                setObjectUrl(null);
                setClientError(null);
                return;
              }
              setClientError(validateClient(next));
              setFile(next);
              setObjectUrl(URL.createObjectURL(next));
            }}
          />
          <p className="truncate text-xs text-muted-foreground">
            {file
              ? `${file.name}(${formatSize(file.size)})`
              : existingUrl
                ? "已保存图片,选择新文件即可替换"
                : "支持 PNG / JPG / WebP,不超过 5MB"}
          </p>
        </div>
      </div>
      <FieldError message={error ?? undefined} />
    </div>
  );
}

/**
 * 一组成对的转换前/后上传位。required 控制新建(必填)或编辑(可选替换)。
 */
export function PreviewUploadFields({
  required = false,
  existingBeforeUrl,
  existingAfterUrl,
  serverErrors,
}: {
  required?: boolean;
  existingBeforeUrl?: string | null;
  existingAfterUrl?: string | null;
  serverErrors?: Record<string, string>;
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <p className="text-sm font-medium">转换效果对比图</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <PreviewUploadField
          name="previewBefore"
          label={required ? "转换前效果图" : "转换前效果图(可选替换)"}
          required={required}
          existingUrl={existingBeforeUrl}
          serverError={serverErrors?.previewBefore}
        />
        <PreviewUploadField
          name="previewAfter"
          label={required ? "转换后效果图" : "转换后效果图(可选替换)"}
          required={required}
          existingUrl={existingAfterUrl}
          serverError={serverErrors?.previewAfter}
        />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        两张图将用于详情页的转换前/后对比滑块。
      </p>
    </div>
  );
}
