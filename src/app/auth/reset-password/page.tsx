import type { Metadata } from "next";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/auth/session";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "./reset-password-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "重置密码",
};

/**
 * 重置密码页:受保护页面。读取会话是动态操作,
 * 异步子组件必须放在 <Suspense> 边界内(cacheComponents 约束)。
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton />}>
      <ResetPasswordPanel />
    </Suspense>
  );
}

async function ResetPasswordPanel() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/auth/reset-password");
  }
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <ResetPasswordForm />
    </div>
  );
}

function AuthPageSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <div className="w-full space-y-4 rounded-2xl border bg-card p-6 sm:p-8">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
