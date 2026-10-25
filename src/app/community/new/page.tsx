import { Suspense } from "react";
import type { Metadata } from "next";

import { requireUser } from "@/features/auth/session";
import { ThreadForm } from "@/components/community/thread-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "发布讨论",
  description: "在 Viora 社区发布一条新讨论。",
};

/**
 * 发帖页(受保护):requireUser 与表单读取都是动态操作,
 * 包在 <Suspense> 边界内(cacheComponents 约束)。
 */
export default function NewThreadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          发布讨论
        </h1>
        <p className="text-sm text-muted-foreground">
          提问、分享心得或交流想法。发布后社区所有人可见。
        </p>
      </header>

      <Suspense fallback={<NewThreadSkeleton />}>
        <NewThreadPanel />
      </Suspense>
    </div>
  );
}

async function NewThreadPanel() {
  // 未登录跳转登录页,成功后回跳本页
  await requireUser("/community/new");

  return (
    <div className="rounded-2xl border bg-card/40 p-5 sm:p-6">
      <ThreadForm />
    </div>
  );
}

function NewThreadSkeleton() {
  return (
    <div
      className="space-y-5 rounded-2xl border bg-card/40 p-5 sm:p-6"
      aria-busy="true"
      aria-label="发帖表单加载中"
    >
      <Skeleton className="h-9 w-full" />
      <Skeleton className="min-h-56 w-full rounded-lg" />
      <div className="flex justify-end">
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}
