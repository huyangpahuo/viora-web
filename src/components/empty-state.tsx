import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImages, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 搜索/筛选无结果时的空状态 */
export function EmptyState({
  hasFilters,
}: {
  /** 是否由搜索/筛选触发;用于决定提供"清空条件"操作 */
  hasFilters: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-medium">没有找到匹配的插件</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {hasFilters
            ? "换个关键词试试,或者清空筛选条件浏览全部插件。"
            : "当前目录里暂时没有插件。"}
        </p>
      </div>
      {hasFilters ? (
        <Button variant="outline" size="sm" asChild>
          <Link href="/">清空筛选条件</Link>
        </Button>
      ) : null}
    </div>
  );
}

/** 目录没有任何真实预览图时,给用户一句诚实的说明 */
export function NoPreviewNotice({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center justify-center gap-1.5 text-xs text-muted-foreground", className)}>
      <FontAwesomeIcon icon={faImages} className="size-3.5" aria-hidden />
      当前目录暂未收录插件真实预览图,卡片显示为分类占位色块。
    </p>
  );
}
