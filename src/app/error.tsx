"use client";

import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsRotate,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] 页面渲染出错:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 py-32 text-center sm:px-6">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <FontAwesomeIcon icon={faTriangleExclamation} className="size-7 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">页面出错了</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          加载插件目录或渲染页面时出现问题,请稍后重试;如果持续失败,
          可能是 GitHub 目录暂时不可用。
        </p>
      </div>
      <Button onClick={reset} size="sm">
        <FontAwesomeIcon icon={faArrowsRotate} className="size-4" aria-hidden />
        重试
      </Button>
    </div>
  );
}
