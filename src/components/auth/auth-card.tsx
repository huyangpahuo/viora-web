import type { ReactNode } from "react";

/**
 * 认证页通用卡片:深色圆角容器,内部放标题、表单与链接。
 */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full rounded-2xl border bg-card/70 p-6 shadow-xl sm:p-8">
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
