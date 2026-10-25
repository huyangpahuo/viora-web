import type { ReactNode } from "react";

/**
 * 认证页公共容器:深色圆角卡片 + 居中布局。
 * 复用根布局(头部/页脚/Toaster),这里只负责页面主体。
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
      {children}
    </div>
  );
}
