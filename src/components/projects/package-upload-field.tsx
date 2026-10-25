"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileZipper } from "@fortawesome/free-solid-svg-icons";

import { FieldError } from "@/components/projects/project-form-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** 与服务端 package.ts 保持一致的校验规则 */
const PACKAGE_MAX_BYTES = 20 * 1024 * 1024;

function validateClient(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return "安装包只支持 .zip 文件";
  }
  if (file.size <= 0) {
    return "安装包文件是空的,请重新选择";
  }
  if (file.size > PACKAGE_MAX_BYTES) {
    return "安装包不能超过 20MB";
  }
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 插件安装包 zip 上传位(字段名 packageZip,可选)。
 * 选择文件后立即本地校验扩展名与大小;服务端会再做一次同样的校验,
 * 上传目标是作者 hub 仓库的 packages/<pluginId>.zip(覆盖旧包)。
 * 编辑场景传 existingPackagePath 展示当前已上传的包。
 */
export function PackageUploadField({
  existingPackagePath,
  serverError,
}: {
  /** 编辑场景已上传的安装包仓库路径(为空表示尚未上传) */
  existingPackagePath?: string | null;
  serverError?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const error = clientError ?? serverError;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="packageZip">安装包 zip(可选)</Label>
      <div className="flex items-start gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <FontAwesomeIcon
            icon={faFileZipper}
            className={error ? "size-6 text-destructive" : "size-6 text-muted-foreground/60"}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Input
            id="packageZip"
            name="packageZip"
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              if (!next) {
                setFile(null);
                setClientError(null);
                return;
              }
              setClientError(validateClient(next));
              setFile(next);
            }}
          />
          <p className="truncate text-xs text-muted-foreground">
            {file
              ? `${file.name}(${formatSize(file.size)})`
              : existingPackagePath
                ? `已上传安装包(${existingPackagePath}),选择新文件即可替换`
                : "未上传时,下载按钮将回退到仓库源码压缩包"}
          </p>
        </div>
      </div>
      <FieldError message={error ?? undefined} />
      <p className="text-xs leading-relaxed text-muted-foreground">
        上传后详情页的下载按钮直接指向仓库里的这份 zip;支持不超过 20MB 的 .zip 文件,
        再次上传会覆盖旧包。
      </p>
    </div>
  );
}
