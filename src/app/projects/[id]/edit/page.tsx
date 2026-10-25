import { Suspense } from "react";

import { EditProjectPanel } from "./edit-project-panel";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "编辑项目",
};

type Params = Promise<{ id: string }>;

/**
 * 编辑项目页。requireUser、params 与数据库读取都是动态操作,
 * 必须包在 <Suspense> 边界内(cacheComponents 约束)。
 */
export default function EditProjectPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<EditProjectSkeleton />}>
      <EditProjectPanel params={params} />
    </Suspense>
  );
}

function EditProjectSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-28" />
      <div className="space-y-4 rounded-2xl border bg-card/40 p-6">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

// 参数在 Suspense 之外解析以支持真正的 404 状态;本路由放弃 instant 导航,改为阻塞渲染
export const instant = false;
