import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "登录",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function AuthPageSkeleton() {
  return (
    <div className="w-full space-y-4 rounded-2xl border bg-card/40 p-6 sm:p-8">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
