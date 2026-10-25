import { Suspense } from "react";

import { ProjectsList } from "./projects-list";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "我的项目",
};

/**
 * 我的项目列表。requireUser 与数据库读取(会带 cookies)都是动态操作,
 * 必须包在 <Suspense> 边界内(cacheComponents 约束)。
 */
export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsSkeleton />}>
      <ProjectsList />
    </Suspense>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}
