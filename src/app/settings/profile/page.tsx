import { Suspense } from "react";

import { ProfileSettings } from "./profile-settings";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "账号设置",
};

/**
 * 账号设置页。requireUser / searchParams 都是动态读取,
 * 必须包在 <Suspense> 边界内(cacheComponents 约束)。
 */
export default function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ github?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <ProfileSettings searchParams={searchParams} />
    </Suspense>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-4 rounded-2xl border bg-card/40 p-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="space-y-4 rounded-2xl border bg-card/40 p-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-2/3" />
      </div>
    </div>
  );
}
