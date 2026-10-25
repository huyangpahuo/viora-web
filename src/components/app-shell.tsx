"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComments,
  faFolderOpen,
  faGear,
  faHouse,
  faPlus,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";

import { cn } from "@/lib/utils";

/**
 * Pinterest 式全局外壳:
 * - 桌面(≥lg):左侧固定图标导航栏 + 顶部细搜索条
 * - 移动(<lg):顶部搜索条 + 底部固定导航条
 * - 登录/注册等独立页面不渲染外壳(保持居中卡片布局)
 *
 * 会话相关内容(头像菜单)由服务端渲染后经 props 传入。
 */

/** 这些前缀下的页面保持独立布局,不渲染侧栏与导航 */
const AUTH_PREFIXES = ["/login", "/signup", "/forgot-password", "/auth"];

const NAV_ITEMS = [
  { href: "/", label: "首页", icon: faHouse },
  { href: "/community", label: "社区", icon: faComments },
  { href: "/projects/new", label: "发布插件", icon: faPlus, match: "/projects/new" },
  { href: "/projects", label: "我的项目", icon: faFolderOpen },
] as const;

const MOBILE_NAV_ITEMS = [
  { href: "/", label: "首页", icon: faHouse },
  { href: "/community", label: "社区", icon: faComments },
  { href: "/projects/new", label: "发布", icon: faPlus, match: "/projects/new" },
  { href: "/projects", label: "项目", icon: faFolderOpen },
  { href: "/settings/profile", label: "设置", icon: faGear },
] as const;

function isAuthPath(pathname: string): boolean {
  return AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string, match?: string) => {
    if (match) return pathname === match || pathname.startsWith(`${match}/`);
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };
}

export type AppShellProps = {
  children: React.ReactNode;
  /** 顶部搜索条(SearchBar 含 Suspense,由服务端渲染后传入) */
  searchSlot: React.ReactNode;
  /** 侧栏底部的用户区(头像菜单/登录入口,服务端渲染后传入) */
  railUserSlot: React.ReactNode;
};

/**
 * 全局外壳。usePathname 在静态路由的预渲染期可直接解析(路径构建期已知);
 * 动态参数路由(/projects/[id]/edit)需声明 instant = false 走阻塞渲染。
 */
export function AppShell({ children, searchSlot, railUserSlot }: AppShellProps) {
  const pathname = usePathname() ?? "/";
  const isActive = useIsActive();

  if (isAuthPath(pathname)) {
    return <div className="flex min-h-dvh flex-col">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* 桌面左侧图标导航栏 */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center border-r border-border/60 bg-background py-4 lg:flex",
        )}
      >
        <Link
          href="/"
          aria-label="Viora 首页"
          className="mb-4 flex size-11 items-center justify-center rounded-xl text-primary transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} className="size-6" aria-hidden />
        </Link>

        <nav aria-label="主导航" className="flex flex-1 flex-col items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, "match" in item ? item.match : undefined);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <FontAwesomeIcon icon={item.icon} className="size-5" aria-hidden />
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-1.5">
          <Link
            href="/settings/profile"
            title="账号设置"
            aria-label="账号设置"
            className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <FontAwesomeIcon icon={faGear} className="size-5" aria-hidden />
          </Link>
          {railUserSlot}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[72px]">
        {/* 顶部细搜索条 */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-md font-heading text-[15px] font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"
            >
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="size-3" aria-hidden />
              </span>
              Viora
            </Link>
            <div className="mx-auto w-full max-w-2xl">{searchSlot}</div>
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      {/* 移动端底部导航条 */}
      <nav
        aria-label="主导航"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = isActive(item.href, "match" in item ? item.match : undefined);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-16 flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <FontAwesomeIcon icon={item.icon} className="size-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
