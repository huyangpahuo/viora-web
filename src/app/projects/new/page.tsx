import { Suspense } from "react";

import { NewProjectPanel } from "./new-project-panel";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "新建项目",
};

/**
 * 新建项目页。requireUser 与资料读取都是动态操作,
 * 必须包在 <Suspense> 边界内(cacheComponents 约束)。
 */
export default function NewProjectPage() {
  return (
    <Suspense fallback={<NewProjectSkeleton />}>
      <NewProjectPanel />
    </Suspense>
  );
}

function NewProjectSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-28" />
      <div className="space-y-4 rounded-2xl border bg-card/40 p-6">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
