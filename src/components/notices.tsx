import { CloudOff } from "lucide-react";

import { DEMO_PREVIEWS_ENABLED } from "@/features/catalog/demo";
import { cn } from "@/lib/utils";

/** GitHub 拉取失败、正在使用本地快照时的提示 */
export function SnapshotNotice({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90",
        className,
      )}
    >
      <CloudOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <p>
        暂时无法连接 GitHub,当前展示的是随网站发布的目录快照,数据可能不是最新。
      </p>
    </div>
  );
}

/** 演示预览模式的显著横幅,防止把测试图当成真实插件效果 */
export function DemoModeNotice({ className }: { className?: string }) {
  if (!DEMO_PREVIEWS_ENABLED) return null;
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-200/90",
        className,
      )}
    >
      <p>
        演示预览模式已开启:页面中的图片是本地测试图,仅用于验证版面布局,
        <strong className="font-semibold">不是插件的真实效果</strong>。
        正式部署请关闭 NEXT_PUBLIC_DEMO_PREVIEWS。
      </p>
    </div>
  );
}
