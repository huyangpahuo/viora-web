import type { ReactNode } from "react";

/**
 * 认证页通用卡片:暗色画布上的一块亮一档的面板,
 * 靠 1px 细边框与亮度差分层,不用重阴影。
 */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full rounded-2xl border bg-card p-6 sm:p-8">
      {children}
    </div>
  );
}

/** 表单必填星号(纯视觉,aria-hidden) */
export function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden>
      *
    </span>
  );
}
