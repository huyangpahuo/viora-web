"use client";

import { useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

/**
 * 详情页顶部提示条:创建项目成功后服务端会跳转到
 * /plugins/<pluginId>?notice=<plugin.json 初始化失败原因>,
 * 存在 notice 参数时如实展示给作者。
 * useSearchParams 属于动态读取,外层必须包 <Suspense>。
 */
export function PluginNoticeBar() {
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");

  if (!notice) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90"
    >
      <FontAwesomeIcon
        icon={faTriangleExclamation}
        className="mt-0.5 size-4 shrink-0"
        aria-hidden
      />
      <p className="min-w-0 break-words">{notice}</p>
    </div>
  );
}
