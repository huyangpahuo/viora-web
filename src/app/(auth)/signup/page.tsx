import type { Metadata } from "next";
import { Suspense } from "react";

import { SignupForm } from "./signup-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "注册",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton />}>
      <SignupForm />
    </Suspense>
  );
}

function AuthPageSkeleton() {
  return (
    <div className="w-full space-y-4 rounded-2xl border bg-card p-6 sm:p-8">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
